#!/usr/bin/env python3

from mailersend import emails # type: ignore
from dotenv import load_dotenv # type: ignore
from datetime import date
import boto3 # type: ignore
from boto3.dynamodb.conditions import Key # type: ignore
import os
import logging
import base64
import shutil
from datetime import datetime, timezone
from tenacity import retry, stop_after_attempt, wait_exponential # type: ignore
import time

# Load env variables
load_dotenv()

# Constants
DYNAMO_DB_SERVICE = "dynamodb"
S3_SERVICE = "s3"
TEST_SCHEDULED_MESSAGE_DB_TABLE = "ScheduledMessage-7cdasplkt5hiznbjy37rbfmv5q-NONE"
PROD_SCHEDULED_MESSAGE_DB_TABLE = "ScheduledMessage-xz2rdu5k6rbijlhadwv72xp7yy-NONE"
SCHEDULED_MESSAGE_DB_TABLE_DATE_INDEX = "scheduledMessagesByScheduleDate"
SCHEDULE_DATE = "scheduleDate"
TEST_SCHEDULED_MESSAGES_BUCKET_NAME = "amplify-amplifyvitereactt-scheduledmessagesfilesbu-qmnymritgqog"
PROD_SCHEDULED_MESSAGES_BUCKET_NAME = "amplify-d3344kfml0wmg7-ma-scheduledmessagesfilesbu-n6mbzxx3uste"
ETERNAL_EMBRACE_ADMIN_EMAIL = "admin@eternal-embrace-corp.com"
DO_NOT_REPLY = "DO_NOT_REPLY"
EMAIL_RECIPIENT = "LOVED_ONE"
SENT = "SENT"
AWS_ACCESS_KEY_ID = os.getenv('AWS_ACCESS_KEY_ID')
AWS_SECRET_ACCESS_KEY = os.getenv('AWS_SECRET_ACCESS_KEY')
REGION_NAME = os.getenv('AWS_DEFAULT_REGION')
MAILERSEND_API_KEY = os.getenv('MAILERSEND_API_KEY')


# Create a timestamp for the current run
timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
log_dir = os.path.join("logs", timestamp)

# Create the directory if it doesn't exist
os.makedirs(log_dir, exist_ok=True)

# Define the full log file path
log_file_path = os.path.join(log_dir, "app.log")

# Set up logging
logging.basicConfig(
    filename=log_file_path,
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)



# Overall logic
# 1. Cron job runs every midnight 
# 2. Get current date and query DB using date sort key
# 3. Take all of the returned entries and get all row metadata
# 4. Row metadata will contain the to, message and attachments
# 5. Go to s3 and download all the files (temp folder maybe)
# 6. Create a new email object and construct is using files downloaded from s3 and the DB results
# 7. send the email to the TO and mark that DB entry as sent
# 8. If issues arise have catch block and log


# TODO
# Refactor code, make it cleaner and loggging
# how to deal with exceptions and stuff!!!!
# if something fails how can I log this correctly so that I can redrive? - add to another log file?
# issue where even if email was not sent (401) its marked as SENT!!!!

def initialize_s3_resource(s3bucket):
    # Initialize S3 resource
    try: 
        s3 = boto3.resource(
            S3_SERVICE,
            region_name=REGION_NAME,
            aws_access_key_id=AWS_ACCESS_KEY_ID,
            aws_secret_access_key=AWS_SECRET_ACCESS_KEY
        )
        logging.info("S3 resource initialized.")
    except Exception as e:
        logging.exception(f"Failed to initialize S3 resource: {e}")

    bucket = s3.Bucket(s3bucket)
    return bucket


def initialize_dynamodb_resource(dynamodb_table):
    # Initialize DynamoDB resource
    try:
        dynamodb = boto3.resource(
            DYNAMO_DB_SERVICE,
            region_name=REGION_NAME,
            aws_access_key_id=AWS_ACCESS_KEY_ID,
            aws_secret_access_key=AWS_SECRET_ACCESS_KEY
        )
        logging.info("DynamoDB resource initialized.")
    except Exception as e:
        logging.exception(f"Failed to initialize DynamoDB resource: {e}")

    table = dynamodb.Table(dynamodb_table)
    return table


def download_s3_files(s3_resource, identityId, userEmail, scheduleDate):

    #5 
    # s3://amplify-amplifyvitereactt-scheduledmessagesfilesbu-qmnymritgqog/uploads/us-east-1:e349a6b9-5073-c655-a2ef-44b062d503e7/mogli3000@gmail.com/2025-02-21/BoardingPass.pdf

    logging.info(f"Downloading files from S3 for identityId: {identityId} and scheduleDate: {scheduleDate}.")
    # Download each file
    try:
        s3_files_dict = {}
        prefix = f"uploads/{identityId}/{userEmail}/{scheduleDate}/"
        local_dir = "./s3_downloads"

        # Make local dir if not exists
        os.makedirs(local_dir, exist_ok=True)
        for obj in s3_resource.objects.filter(Prefix=prefix):
            if obj.key.endswith("/"):
                continue  # skip folders

            file_name = os.path.basename(obj.key)
            local_path = os.path.join(local_dir, file_name)

            logging.info(f"Downloading {obj.key} -> {local_path}")
            # save file names
            s3_files_dict[obj.key] = local_path
            s3_resource.download_file(obj.key, local_path)

        logging.info(f"Done downloading all S3 files for identiyId: {identityId} | userEmail: {userEmail} and scheduleDate: {scheduleDate}.")

        return s3_files_dict

    except Exception as e:
        logging.error(f"Failed to download files from S3 for userEmail: {userEmail}, identityId: {identityId} and obj.key {obj.key}: {e}")
        return None


def s3_files_to_attachments(s3_files):
    """
    Converts a dictionary of S3 files (file name -> local path) to a list of MailerSend attachments.
    """
    attachments = []

    for file_name, local_path in s3_files.items():
        try:
            if not os.path.exists(local_path):
                logging.warning(f"File not found: {local_path}")
                continue

            with open(local_path, 'rb') as attachment_file:
                att_read = attachment_file.read()
                att_base64 = base64.b64encode(att_read).decode('ascii')

                attachments.append({
                    "id": file_name,
                    "filename": file_name,
                    "content": att_base64,
                    "disposition": "attachment"
                })

        except Exception as e:
            logging.error(f"Error adding file '{file_name}' as an attachment: {e}")

    return attachments

# TODO: break this down into 2 methods (one for email and other for updating db). this way retry can work as expected for email if exception is thrown
@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=10))
def mailer_send(mailer, email_to, email_subject, email_html, email_plaintext, s3_files, dynamodb_table, dynamodb_item):
    try:
        # define an empty dict to populate with mail values
        # should i do bulk emails? - try with ton of emails and see...
        mail_body = {}

        mail_from = {
            "name": "Eternal Embrace Corp",
            "email": ETERNAL_EMBRACE_ADMIN_EMAIL,
        }

        recipients = [
            {
                "name": email_to,
                "email": email_to,
            }
        ]

        reply_to = {
            "name": DO_NOT_REPLY,
            "email": "admin@eternal-embrace-corp.com",
        }

        attachments = s3_files_to_attachments(s3_files)

        mailer.set_mail_from(mail_from, mail_body)
        mailer.set_mail_to(recipients, mail_body)
        mailer.set_subject(email_subject, mail_body)
        mailer.set_html_content(email_html, mail_body)
        mailer.set_plaintext_content(email_plaintext, mail_body)
        mailer.set_reply_to(reply_to, mail_body)
        if attachments:
            mailer.set_attachments(attachments, mail_body)
        else:
            logging.info(f"No valid attachments found for email to {email_to}.")

        #7
        # using print() will also return status code and data
        response = mailer.send(mail_body)

        # logging.info(f"Sent email with mail_body: {mail_body} Response: {response}")
        logging.info(f"Sent email Response: {response}")

        try:
            # TODO if response is 200 or 202 then only mark once ALL people have a 200
            # right now it marks as successfull as soon as one email is sent
            # Update item status as SENT if successful
            time_updated = datetime.now(timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')

            response = dynamodb_table.update_item(
                Key={
                    'userEmail': dynamodb_item['userEmail'],
                    'scheduleDate': dynamodb_item['scheduleDate']
                },
                UpdateExpression="SET messageStatus = :status, updatedAt = :updatedAt",
                ExpressionAttributeValues={
                    ':status': SENT,
                    ':updatedAt': time_updated
                },
                ReturnValues="UPDATED_NEW"
            )

            logging.info(f"Updated item status to {SENT}: {response}")
        except Exception as e:
            logging.error(f"Failed to update item status in DynamoDB: {e}")
    except Exception as e:
        logging.error(f"Failed to send email to {email_to} with error: {e}")
        return False


def main():
    #2
    today = date.today().strftime("%m-%d-%Y")
    logging.info(f"Running script for today's date: {today}")

    # set up s3 and dynamo db resources
    s3_resource = initialize_s3_resource(PROD_SCHEDULED_MESSAGES_BUCKET_NAME)
    dynamo_db_resource = initialize_dynamodb_resource(PROD_SCHEDULED_MESSAGE_DB_TABLE)

    # Query the primary table using secondary index "scheduleDate" for entires with todays date
    response = dynamo_db_resource.query(
        IndexName=SCHEDULED_MESSAGE_DB_TABLE_DATE_INDEX,
        KeyConditionExpression=Key(SCHEDULE_DATE).eq(str(today)))

    # Run logic on response to get appropriate email and s3 info
    items = response.get('Items', [])
    #3 
    if not items:
        logging.warning(f"No items found for today's date {today}. Exiting.")
        exit(0)
    for item in items:
        logging.info(f"Processing item: {item}")

        #4
        userEmail = item['userEmail']
        scheduleDate = item['scheduleDate']
        updatedAt = item['updatedAt']
        createdAt = item['createdAt']
        identityId = item['identityId']
        owner = item['owner']
        recipients = item['recipients']
        message = item['message']
        id = item['id']
        messageStatus = item['messageStatus']
        typename = item['__typename']

        # Check if the schedule date matches today's date
        if today != scheduleDate:
            logging.warning(f"Schedule date {scheduleDate} does not match today's date {today}!. Skipping.")
            continue
        # Check if the message status is SENT
        if messageStatus == SENT:
            logging.warning(f"Message status is already {SENT}. Skipping sending email for {item}")
            continue
        # Sanity check passed so we can continue
        logging.info(f"Schedule date {scheduleDate} matches today's date {today} amd message is not {SENT}. Continuing.")

        # Download files from S3
        s3_files_dict = download_s3_files(s3_resource, identityId, userEmail, scheduleDate)

        #6
        # mailer = emails.NewEmail(os.getenv('MAILERSEND_API_KEY'))
        mailer = emails.NewEmail(MAILERSEND_API_KEY)

        for recipient in recipients:
            mailer_send(
                mailer=mailer,
                email_to=recipient,
                email_subject=EMAIL_RECIPIENT,
                email_html=message,
                email_plaintext=message,
                s3_files=s3_files_dict,
                dynamodb_item=item,
                dynamodb_table=dynamo_db_resource)
            time.sleep(1)

        # Delete the entire directory and everything inside it
        local_dir = "./s3_downloads"
        if os.path.exists(local_dir):
            shutil.rmtree(local_dir)


if __name__ == "__main__":
    main()

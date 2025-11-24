import { Storage } from '@google-cloud/storage';

let storageClient: Storage | null = null;

function getStorageClient(): Storage {
  if (!storageClient) {
    const projectId = process.env.GCP_PROJECT_ID;
    const clientEmail = process.env.GCP_CLIENT_EMAIL;
    const privateKey = process.env.GCP_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error('GCP credentials not configured. Please set GCP_PROJECT_ID, GCP_CLIENT_EMAIL, and GCP_PRIVATE_KEY environment variables.');
    }

    storageClient = new Storage({
      projectId,
      credentials: {
        client_email: clientEmail,
        private_key: privateKey.replace(/\\n/g, '\n'),
      },
    });
  }

  return storageClient;
}

export interface EmailData {
  subject: string;
  from: string;
  to: string;
  receivedDate: string;
  htmlBody?: string;
  plainTextBody?: string;
  headers?: Record<string, string>;
  gmailThreadId: string;
  gmailMessageId: string;
  attachments?: Array<{
    filename: string;
    mimeType: string;
    size: number;
    contentId?: string;
  }>;
}

export async function uploadEmailToGCP(
  opportunityId: number,
  gmailMessageId: string,
  emailData: EmailData
): Promise<string> {
  try {
    const storage = getStorageClient();
    const bucketName = process.env.GCP_STORAGE_BUCKET;

    if (!bucketName) {
      throw new Error('GCP_STORAGE_BUCKET environment variable not set');
    }

    const bucket = storage.bucket(bucketName);
    const fileName = `emails/${opportunityId}/${gmailMessageId}.json`;
    const file = bucket.file(fileName);

    const emailContent = JSON.stringify(emailData, null, 2);

    await file.save(emailContent, {
      contentType: 'application/json',
      metadata: {
        opportunityId: String(opportunityId),
        gmailMessageId: gmailMessageId,
        gmailThreadId: emailData.gmailThreadId,
        uploadedAt: new Date().toISOString(),
      },
    });

    console.log(`Email uploaded to GCP Storage: ${fileName}`);
    return fileName;
  } catch (error) {
    console.error('Error uploading email to GCP Storage:', error);
    throw new Error(`Failed to upload email to GCP Storage: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getEmailFromGCP(storagePath: string): Promise<EmailData> {
  try {
    const storage = getStorageClient();
    const bucketName = process.env.GCP_STORAGE_BUCKET;

    if (!bucketName) {
      throw new Error('GCP_STORAGE_BUCKET environment variable not set');
    }

    const bucket = storage.bucket(bucketName);
    const file = bucket.file(storagePath);

    const [contents] = await file.download();
    const emailData = JSON.parse(contents.toString('utf-8'));

    return emailData;
  } catch (error) {
    console.error('Error downloading email from GCP Storage:', error);
    throw new Error(`Failed to download email from GCP Storage: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function deleteEmailFromGCP(storagePath: string): Promise<void> {
  try {
    const storage = getStorageClient();
    const bucketName = process.env.GCP_STORAGE_BUCKET;

    if (!bucketName) {
      throw new Error('GCP_STORAGE_BUCKET environment variable not set');
    }

    const bucket = storage.bucket(bucketName);
    const file = bucket.file(storagePath);

    await file.delete();
    console.log(`Email deleted from GCP Storage: ${storagePath}`);
  } catch (error) {
    console.error('Error deleting email from GCP Storage:', error);
    throw new Error(`Failed to delete email from GCP Storage: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function isGCPConfigured(): boolean {
  return !!(
    process.env.GCP_PROJECT_ID &&
    process.env.GCP_CLIENT_EMAIL &&
    process.env.GCP_PRIVATE_KEY &&
    process.env.GCP_STORAGE_BUCKET
  );
}

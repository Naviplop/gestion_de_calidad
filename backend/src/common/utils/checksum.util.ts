import { createHash } from 'crypto';

export function calculateChecksum(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

export async function calculateChecksumFromStream(stream: AsyncIterable<Buffer>): Promise<string> {
  const hash = createHash('sha256');

  for await (const chunk of stream) {
    hash.update(chunk);
  }

  return hash.digest('hex');
}

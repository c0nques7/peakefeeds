import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { uploadFile, getDownloadUrl } from '@/lib/b2';
import { generateFileName, validateFile, verifiedMediaType } from '@/lib/storage-utils';
import { getPostingBlockReason } from "@/lib/penalties";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const blocked = await getPostingBlockReason(session.user.id);
    if (blocked) return NextResponse.json({ error: blocked }, { status: 403 });

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    let buffer: Buffer;
    let contentType: string;
    try {
      validateFile(file);
      buffer = Buffer.from(await file.arrayBuffer());
      // Trust the bytes, not the client's name or declared type
      contentType = verifiedMediaType(buffer, file.type);
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const fileName = generateFileName(contentType);
    
    // Upload to B2
    await uploadFile(fileName, buffer, contentType);
    
    // Get the public URL
    const url = await getDownloadUrl(fileName);

    return NextResponse.json({ 
      url, 
      fileName,
      type: contentType 
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
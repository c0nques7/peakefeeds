import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { uploadFile, getDownloadUrl } from '@/lib/b2';
import { generateFileName, validateFile } from '@/lib/storage-utils';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    try {
      validateFile(file);
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = generateFileName(file.name);
    
    // Upload to B2
    await uploadFile(fileName, buffer, file.type);
    
    // Get the public URL
    const url = await getDownloadUrl(fileName);

    return NextResponse.json({ 
      url, 
      fileName,
      type: file.type 
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
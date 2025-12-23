import { prisma } from "@/lib/db";
import { AdminLogType } from "@prisma/client";
import { headers } from "next/headers";

interface CreateLogParams {
  adminId: string;
  eventType: AdminLogType;
  targetResource?: string;
  details?: any;
}

export async function createAdminLog({
  adminId,
  eventType,
  targetResource,
  details
}: CreateLogParams) {
  try {
    const headersList = await headers();
    const userAgent = headersList.get("user-agent") || undefined;
    const ipAddress = headersList.get("x-forwarded-for") || undefined;

    await prisma.adminLog.create({
      data: {
        adminId,
        eventType,
        targetResource,
        details: details ? JSON.parse(JSON.stringify(details)) : undefined,
        ipAddress,
        userAgent,
      },
    });
  } catch (error) {
    console.error("Failed to create admin log:", error);
  }
}

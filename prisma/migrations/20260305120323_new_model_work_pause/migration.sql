-- CreateTable
CREATE TABLE "WorkPause" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),

    CONSTRAINT "WorkPause_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "WorkPause" ADD CONSTRAINT "WorkPause_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "WorkSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

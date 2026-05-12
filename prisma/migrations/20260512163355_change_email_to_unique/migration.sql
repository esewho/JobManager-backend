/*
  Warnings:

  - A unique constraint covering the columns `[email]` on the table `WorkspaceInvitation` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceInvitation_email_key" ON "WorkspaceInvitation"("email");

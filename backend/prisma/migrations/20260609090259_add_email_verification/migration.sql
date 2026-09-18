/*
  Warnings:

  - You are about to drop the column `phoneVerified` on the `user` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `user` DROP COLUMN `phoneVerified`,
    ADD COLUMN `emailVerified` BOOLEAN NOT NULL DEFAULT false;

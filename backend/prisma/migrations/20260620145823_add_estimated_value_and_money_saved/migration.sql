-- AlterTable
ALTER TABLE `booking` ADD COLUMN `moneySaved` DOUBLE NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `item` ADD COLUMN `estimatedValue` DOUBLE NULL,
    MODIFY `address` TEXT NOT NULL;

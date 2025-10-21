import { MigrationInterface, QueryRunner } from "typeorm";

export class AddReviewToQuestion1755014201217 implements MigrationInterface {
    name = 'AddReviewToQuestion1755014201217'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`questions\` ADD \`status\` enum ('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending'`);
        await queryRunner.query(`ALTER TABLE \`questions\` ADD \`reviewedAt\` timestamp NULL`);
        await queryRunner.query(`ALTER TABLE \`questions\` ADD \`reviewComment\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`questions\` ADD \`reviewedById\` varchar(36) NULL`);
        await queryRunner.query(`ALTER TABLE \`questions\` DROP FOREIGN KEY \`FK_bdbe88eee023b14b483ad0d830f\``);
        await queryRunner.query(`ALTER TABLE \`questions\` CHANGE \`creatorId\` \`creatorId\` varchar(36) NULL`);
        await queryRunner.query(`ALTER TABLE \`claims\` CHANGE \`responseComment\` \`responseComment\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`test_sessions\` CHANGE \`timeLimit\` \`timeLimit\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`test_sessions\` CHANGE \`ended_at\` \`ended_at\` timestamp NULL`);
        await queryRunner.query(`ALTER TABLE \`refresh_tokens\` CHANGE \`expiresAt\` \`expiresAt\` timestamp NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`questions\` ADD CONSTRAINT \`FK_bdbe88eee023b14b483ad0d830f\` FOREIGN KEY (\`creatorId\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`questions\` ADD CONSTRAINT \`FK_e52e58fc5d50b943802a3082cf7\` FOREIGN KEY (\`reviewedById\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`questions\` DROP FOREIGN KEY \`FK_e52e58fc5d50b943802a3082cf7\``);
        await queryRunner.query(`ALTER TABLE \`questions\` DROP FOREIGN KEY \`FK_bdbe88eee023b14b483ad0d830f\``);
        await queryRunner.query(`ALTER TABLE \`refresh_tokens\` CHANGE \`expiresAt\` \`expiresAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP()`);
        await queryRunner.query(`ALTER TABLE \`test_sessions\` CHANGE \`ended_at\` \`ended_at\` timestamp NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`test_sessions\` CHANGE \`timeLimit\` \`timeLimit\` int NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`claims\` CHANGE \`responseComment\` \`responseComment\` text NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`questions\` CHANGE \`creatorId\` \`creatorId\` varchar(36) NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`questions\` ADD CONSTRAINT \`FK_bdbe88eee023b14b483ad0d830f\` FOREIGN KEY (\`creatorId\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`questions\` DROP COLUMN \`reviewedById\``);
        await queryRunner.query(`ALTER TABLE \`questions\` DROP COLUMN \`reviewComment\``);
        await queryRunner.query(`ALTER TABLE \`questions\` DROP COLUMN \`reviewedAt\``);
        await queryRunner.query(`ALTER TABLE \`questions\` DROP COLUMN \`status\``);
    }

}

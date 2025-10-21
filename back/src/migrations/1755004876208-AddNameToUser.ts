import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNameToUser1755004876208 implements MigrationInterface {
    name = 'AddNameToUser1755004876208'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`diagrams\` DROP FOREIGN KEY \`FK_f8e759235c69d03c33984f898cc\``);
        await queryRunner.query(`ALTER TABLE \`diagrams\` CHANGE \`creatorId\` \`title\` varchar(36) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`questions\` DROP COLUMN \`text\``);
        await queryRunner.query(`ALTER TABLE \`questions\` DROP COLUMN \`difficulty\``);
        await queryRunner.query(`ALTER TABLE \`test_sessions\` DROP COLUMN \`difficulty\``);
        await queryRunner.query(`ALTER TABLE \`questions\` ADD \`prompt\` text NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`questions\` ADD \`hint\` text NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`diagrams\` DROP COLUMN \`title\``);
        await queryRunner.query(`ALTER TABLE \`diagrams\` ADD \`title\` varchar(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`questions\` DROP FOREIGN KEY \`FK_bdbe88eee023b14b483ad0d830f\``);
        await queryRunner.query(`ALTER TABLE \`questions\` CHANGE \`creatorId\` \`creatorId\` varchar(36) NULL`);
        await queryRunner.query(`ALTER TABLE \`claims\` CHANGE \`responseComment\` \`responseComment\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`test_sessions\` CHANGE \`timeLimit\` \`timeLimit\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`test_sessions\` CHANGE \`ended_at\` \`ended_at\` timestamp NULL`);
        await queryRunner.query(`ALTER TABLE \`refresh_tokens\` CHANGE \`expiresAt\` \`expiresAt\` timestamp NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`questions\` ADD CONSTRAINT \`FK_bdbe88eee023b14b483ad0d830f\` FOREIGN KEY (\`creatorId\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`questions\` DROP FOREIGN KEY \`FK_bdbe88eee023b14b483ad0d830f\``);
        await queryRunner.query(`ALTER TABLE \`refresh_tokens\` CHANGE \`expiresAt\` \`expiresAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP()`);
        await queryRunner.query(`ALTER TABLE \`test_sessions\` CHANGE \`ended_at\` \`ended_at\` timestamp NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`test_sessions\` CHANGE \`timeLimit\` \`timeLimit\` int NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`claims\` CHANGE \`responseComment\` \`responseComment\` text NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`questions\` CHANGE \`creatorId\` \`creatorId\` varchar(36) NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`questions\` ADD CONSTRAINT \`FK_bdbe88eee023b14b483ad0d830f\` FOREIGN KEY (\`creatorId\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`diagrams\` DROP COLUMN \`title\``);
        await queryRunner.query(`ALTER TABLE \`diagrams\` ADD \`title\` varchar(36) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`questions\` DROP COLUMN \`hint\``);
        await queryRunner.query(`ALTER TABLE \`questions\` DROP COLUMN \`prompt\``);
        await queryRunner.query(`ALTER TABLE \`test_sessions\` ADD \`difficulty\` enum ('principiante', 'intermedio', 'difícil') NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`questions\` ADD \`difficulty\` enum ('principiante', 'intermedio', 'difícil') NOT NULL DEFAULT ''principiante''`);
        await queryRunner.query(`ALTER TABLE \`questions\` ADD \`text\` text NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`diagrams\` CHANGE \`title\` \`creatorId\` varchar(36) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`diagrams\` ADD CONSTRAINT \`FK_f8e759235c69d03c33984f898cc\` FOREIGN KEY (\`creatorId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}

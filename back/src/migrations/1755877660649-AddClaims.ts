import { MigrationInterface, QueryRunner } from "typeorm";

export class AddClaims1755877660649 implements MigrationInterface {
    name = 'AddClaims1755877660649'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`claims\` DROP FOREIGN KEY \`FK_299a3ed5259cccd5cf541512e73\``);
        await queryRunner.query(`ALTER TABLE \`claims\` DROP FOREIGN KEY \`FK_2cb2356bb6c83edd491dea0f79f\``);
        await queryRunner.query(`ALTER TABLE \`claims\` DROP FOREIGN KEY \`FK_b1ab484147fe65e8b650ac40bfa\``);
        await queryRunner.query(`ALTER TABLE \`claims\` DROP COLUMN \`justification\``);
        await queryRunner.query(`ALTER TABLE \`claims\` DROP COLUMN \`responseComment\``);
        await queryRunner.query(`ALTER TABLE \`claims\` DROP COLUMN \`created_at\``);
        await queryRunner.query(`ALTER TABLE \`claims\` DROP COLUMN \`updated_at\``);
        await queryRunner.query(`ALTER TABLE \`claims\` DROP COLUMN \`userId\``);
        await queryRunner.query(`ALTER TABLE \`claims\` DROP COLUMN \`testSessionId\``);
        await queryRunner.query(`ALTER TABLE \`claims\` DROP COLUMN \`questionId\``);
        await queryRunner.query(`ALTER TABLE \`claims\` ADD \`promptSnapshot\` text NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`claims\` ADD \`optionsSnapshot\` json NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`claims\` ADD \`chosenIndex\` int NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`claims\` ADD \`correctIndexAtSubmission\` int NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`claims\` ADD \`explanation\` text NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`claims\` ADD \`reviewerComment\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`claims\` ADD \`reviewedAt\` timestamp NULL`);
        await queryRunner.query(`ALTER TABLE \`claims\` ADD \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`claims\` ADD \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`claims\` ADD \`question_id\` varchar(36) NULL`);
        await queryRunner.query(`ALTER TABLE \`claims\` ADD \`diagram_id\` varchar(36) NULL`);
        await queryRunner.query(`ALTER TABLE \`claims\` ADD \`student_id\` varchar(36) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`claims\` ADD \`reviewer_id\` varchar(36) NULL`);
        await queryRunner.query(`ALTER TABLE \`diagrams\` ADD UNIQUE INDEX \`IDX_2022c2f0548e362c5060f3c1f1\` (\`title\`)`);
        await queryRunner.query(`ALTER TABLE \`questions\` DROP FOREIGN KEY \`FK_bdbe88eee023b14b483ad0d830f\``);
        await queryRunner.query(`ALTER TABLE \`questions\` DROP FOREIGN KEY \`FK_e52e58fc5d50b943802a3082cf7\``);
        await queryRunner.query(`ALTER TABLE \`questions\` CHANGE \`reviewedAt\` \`reviewedAt\` timestamp NULL`);
        await queryRunner.query(`ALTER TABLE \`questions\` CHANGE \`reviewComment\` \`reviewComment\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`questions\` CHANGE \`creatorId\` \`creatorId\` varchar(36) NULL`);
        await queryRunner.query(`ALTER TABLE \`questions\` CHANGE \`reviewedById\` \`reviewedById\` varchar(36) NULL`);
        await queryRunner.query(`ALTER TABLE \`claims\` CHANGE \`status\` \`status\` enum ('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING'`);
        await queryRunner.query(`ALTER TABLE \`refresh_tokens\` CHANGE \`expiresAt\` \`expiresAt\` timestamp NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`questions\` ADD CONSTRAINT \`FK_bdbe88eee023b14b483ad0d830f\` FOREIGN KEY (\`creatorId\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`questions\` ADD CONSTRAINT \`FK_e52e58fc5d50b943802a3082cf7\` FOREIGN KEY (\`reviewedById\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`claims\` ADD CONSTRAINT \`FK_f5ba25037816797d23e98a00994\` FOREIGN KEY (\`question_id\`) REFERENCES \`questions\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`claims\` ADD CONSTRAINT \`FK_94b39eab939e6e5cff0df666c49\` FOREIGN KEY (\`diagram_id\`) REFERENCES \`diagrams\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`claims\` ADD CONSTRAINT \`FK_d4647efdb6d488286a69e2d197e\` FOREIGN KEY (\`student_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`claims\` ADD CONSTRAINT \`FK_101b85ed9a1f068fd22c65a1681\` FOREIGN KEY (\`reviewer_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`claims\` DROP FOREIGN KEY \`FK_101b85ed9a1f068fd22c65a1681\``);
        await queryRunner.query(`ALTER TABLE \`claims\` DROP FOREIGN KEY \`FK_d4647efdb6d488286a69e2d197e\``);
        await queryRunner.query(`ALTER TABLE \`claims\` DROP FOREIGN KEY \`FK_94b39eab939e6e5cff0df666c49\``);
        await queryRunner.query(`ALTER TABLE \`claims\` DROP FOREIGN KEY \`FK_f5ba25037816797d23e98a00994\``);
        await queryRunner.query(`ALTER TABLE \`questions\` DROP FOREIGN KEY \`FK_e52e58fc5d50b943802a3082cf7\``);
        await queryRunner.query(`ALTER TABLE \`questions\` DROP FOREIGN KEY \`FK_bdbe88eee023b14b483ad0d830f\``);
        await queryRunner.query(`ALTER TABLE \`refresh_tokens\` CHANGE \`expiresAt\` \`expiresAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP()`);
        await queryRunner.query(`ALTER TABLE \`claims\` CHANGE \`status\` \`status\` enum ('pending', 'approved', 'rejected') NOT NULL DEFAULT ''pending''`);
        await queryRunner.query(`ALTER TABLE \`questions\` CHANGE \`reviewedById\` \`reviewedById\` varchar(36) NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`questions\` CHANGE \`creatorId\` \`creatorId\` varchar(36) NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`questions\` CHANGE \`reviewComment\` \`reviewComment\` text NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`questions\` CHANGE \`reviewedAt\` \`reviewedAt\` timestamp NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`questions\` ADD CONSTRAINT \`FK_e52e58fc5d50b943802a3082cf7\` FOREIGN KEY (\`reviewedById\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`questions\` ADD CONSTRAINT \`FK_bdbe88eee023b14b483ad0d830f\` FOREIGN KEY (\`creatorId\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`diagrams\` DROP INDEX \`IDX_2022c2f0548e362c5060f3c1f1\``);
        await queryRunner.query(`ALTER TABLE \`claims\` DROP COLUMN \`reviewer_id\``);
        await queryRunner.query(`ALTER TABLE \`claims\` DROP COLUMN \`student_id\``);
        await queryRunner.query(`ALTER TABLE \`claims\` DROP COLUMN \`diagram_id\``);
        await queryRunner.query(`ALTER TABLE \`claims\` DROP COLUMN \`question_id\``);
        await queryRunner.query(`ALTER TABLE \`claims\` DROP COLUMN \`updatedAt\``);
        await queryRunner.query(`ALTER TABLE \`claims\` DROP COLUMN \`createdAt\``);
        await queryRunner.query(`ALTER TABLE \`claims\` DROP COLUMN \`reviewedAt\``);
        await queryRunner.query(`ALTER TABLE \`claims\` DROP COLUMN \`reviewerComment\``);
        await queryRunner.query(`ALTER TABLE \`claims\` DROP COLUMN \`explanation\``);
        await queryRunner.query(`ALTER TABLE \`claims\` DROP COLUMN \`correctIndexAtSubmission\``);
        await queryRunner.query(`ALTER TABLE \`claims\` DROP COLUMN \`chosenIndex\``);
        await queryRunner.query(`ALTER TABLE \`claims\` DROP COLUMN \`optionsSnapshot\``);
        await queryRunner.query(`ALTER TABLE \`claims\` DROP COLUMN \`promptSnapshot\``);
        await queryRunner.query(`ALTER TABLE \`claims\` ADD \`questionId\` varchar(36) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`claims\` ADD \`testSessionId\` varchar(36) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`claims\` ADD \`userId\` varchar(36) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`claims\` ADD \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`claims\` ADD \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`claims\` ADD \`responseComment\` text NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`claims\` ADD \`justification\` text NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`claims\` ADD CONSTRAINT \`FK_b1ab484147fe65e8b650ac40bfa\` FOREIGN KEY (\`questionId\`) REFERENCES \`questions\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`claims\` ADD CONSTRAINT \`FK_2cb2356bb6c83edd491dea0f79f\` FOREIGN KEY (\`testSessionId\`) REFERENCES \`test_sessions\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`claims\` ADD CONSTRAINT \`FK_299a3ed5259cccd5cf541512e73\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}

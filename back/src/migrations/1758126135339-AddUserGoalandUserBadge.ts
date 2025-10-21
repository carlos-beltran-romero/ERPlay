import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserGoalandUserBadge1758126135339 implements MigrationInterface {
    name = 'AddUserGoalandUserBadge1758126135339'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`user_goals\` (\`id\` varchar(36) NOT NULL, \`weeklyTargetQuestions\` int NOT NULL DEFAULT '70', \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`user_id\` varchar(36) NULL, UNIQUE INDEX \`REL_824aea29828f9c62c80fbe585b\` (\`user_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`user_badges\` (\`id\` varchar(36) NOT NULL, \`label\` varchar(120) NOT NULL, \`earnedAt\` timestamp NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`user_id\` varchar(36) NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`questions\` DROP FOREIGN KEY \`FK_bdbe88eee023b14b483ad0d830f\``);
        await queryRunner.query(`ALTER TABLE \`questions\` DROP FOREIGN KEY \`FK_e52e58fc5d50b943802a3082cf7\``);
        await queryRunner.query(`ALTER TABLE \`questions\` CHANGE \`reviewedAt\` \`reviewedAt\` timestamp NULL`);
        await queryRunner.query(`ALTER TABLE \`questions\` CHANGE \`reviewComment\` \`reviewComment\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`questions\` CHANGE \`creatorId\` \`creatorId\` varchar(36) NULL`);
        await queryRunner.query(`ALTER TABLE \`questions\` CHANGE \`reviewedById\` \`reviewedById\` varchar(36) NULL`);
        await queryRunner.query(`ALTER TABLE \`test_events\` DROP FOREIGN KEY \`FK_4d32a4b999e0fbe7045fc6cb8de\``);
        await queryRunner.query(`ALTER TABLE \`test_events\` DROP COLUMN \`payload\``);
        await queryRunner.query(`ALTER TABLE \`test_events\` ADD \`payload\` json NULL`);
        await queryRunner.query(`ALTER TABLE \`test_events\` CHANGE \`result_id\` \`result_id\` varchar(36) NULL`);
        await queryRunner.query(`ALTER TABLE \`test_sessions\` CHANGE \`durationSeconds\` \`durationSeconds\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`test_sessions\` CHANGE \`score\` \`score\` float NULL`);
        await queryRunner.query(`ALTER TABLE \`test_sessions\` DROP COLUMN \`metadata\``);
        await queryRunner.query(`ALTER TABLE \`test_sessions\` ADD \`metadata\` json NULL`);
        await queryRunner.query(`ALTER TABLE \`test_sessions\` CHANGE \`completedAt\` \`completedAt\` timestamp NULL`);
        await queryRunner.query(`ALTER TABLE \`test_results\` DROP FOREIGN KEY \`FK_f9639f4d28117f9fca41982f038\``);
        await queryRunner.query(`ALTER TABLE \`test_results\` CHANGE \`selectedIndex\` \`selectedIndex\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`test_results\` CHANGE \`isCorrect\` \`isCorrect\` tinyint NULL`);
        await queryRunner.query(`ALTER TABLE \`test_results\` CHANGE \`question_id\` \`question_id\` varchar(36) NULL`);
        await queryRunner.query(`ALTER TABLE \`claims\` DROP FOREIGN KEY \`FK_f5ba25037816797d23e98a00994\``);
        await queryRunner.query(`ALTER TABLE \`claims\` DROP FOREIGN KEY \`FK_e35fa0900ccac58f73ddee5ad74\``);
        await queryRunner.query(`ALTER TABLE \`claims\` DROP FOREIGN KEY \`FK_94b39eab939e6e5cff0df666c49\``);
        await queryRunner.query(`ALTER TABLE \`claims\` DROP FOREIGN KEY \`FK_101b85ed9a1f068fd22c65a1681\``);
        await queryRunner.query(`ALTER TABLE \`claims\` CHANGE \`reviewerComment\` \`reviewerComment\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`claims\` CHANGE \`reviewedAt\` \`reviewedAt\` timestamp NULL`);
        await queryRunner.query(`ALTER TABLE \`claims\` CHANGE \`question_id\` \`question_id\` varchar(36) NULL`);
        await queryRunner.query(`ALTER TABLE \`claims\` CHANGE \`test_result_id\` \`test_result_id\` varchar(36) NULL`);
        await queryRunner.query(`ALTER TABLE \`claims\` CHANGE \`diagram_id\` \`diagram_id\` varchar(36) NULL`);
        await queryRunner.query(`ALTER TABLE \`claims\` CHANGE \`reviewer_id\` \`reviewer_id\` varchar(36) NULL`);
        await queryRunner.query(`ALTER TABLE \`refresh_tokens\` CHANGE \`expiresAt\` \`expiresAt\` timestamp NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`questions\` ADD CONSTRAINT \`FK_bdbe88eee023b14b483ad0d830f\` FOREIGN KEY (\`creatorId\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`questions\` ADD CONSTRAINT \`FK_e52e58fc5d50b943802a3082cf7\` FOREIGN KEY (\`reviewedById\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`test_events\` ADD CONSTRAINT \`FK_4d32a4b999e0fbe7045fc6cb8de\` FOREIGN KEY (\`result_id\`) REFERENCES \`test_results\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`test_results\` ADD CONSTRAINT \`FK_f9639f4d28117f9fca41982f038\` FOREIGN KEY (\`question_id\`) REFERENCES \`questions\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`claims\` ADD CONSTRAINT \`FK_f5ba25037816797d23e98a00994\` FOREIGN KEY (\`question_id\`) REFERENCES \`questions\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`claims\` ADD CONSTRAINT \`FK_e35fa0900ccac58f73ddee5ad74\` FOREIGN KEY (\`test_result_id\`) REFERENCES \`test_results\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`claims\` ADD CONSTRAINT \`FK_94b39eab939e6e5cff0df666c49\` FOREIGN KEY (\`diagram_id\`) REFERENCES \`diagrams\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`claims\` ADD CONSTRAINT \`FK_101b85ed9a1f068fd22c65a1681\` FOREIGN KEY (\`reviewer_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`user_goals\` ADD CONSTRAINT \`FK_824aea29828f9c62c80fbe585ba\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`user_badges\` ADD CONSTRAINT \`FK_f1221d9b1aaa64b1f3c98ed46d3\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`user_badges\` DROP FOREIGN KEY \`FK_f1221d9b1aaa64b1f3c98ed46d3\``);
        await queryRunner.query(`ALTER TABLE \`user_goals\` DROP FOREIGN KEY \`FK_824aea29828f9c62c80fbe585ba\``);
        await queryRunner.query(`ALTER TABLE \`claims\` DROP FOREIGN KEY \`FK_101b85ed9a1f068fd22c65a1681\``);
        await queryRunner.query(`ALTER TABLE \`claims\` DROP FOREIGN KEY \`FK_94b39eab939e6e5cff0df666c49\``);
        await queryRunner.query(`ALTER TABLE \`claims\` DROP FOREIGN KEY \`FK_e35fa0900ccac58f73ddee5ad74\``);
        await queryRunner.query(`ALTER TABLE \`claims\` DROP FOREIGN KEY \`FK_f5ba25037816797d23e98a00994\``);
        await queryRunner.query(`ALTER TABLE \`test_results\` DROP FOREIGN KEY \`FK_f9639f4d28117f9fca41982f038\``);
        await queryRunner.query(`ALTER TABLE \`test_events\` DROP FOREIGN KEY \`FK_4d32a4b999e0fbe7045fc6cb8de\``);
        await queryRunner.query(`ALTER TABLE \`questions\` DROP FOREIGN KEY \`FK_e52e58fc5d50b943802a3082cf7\``);
        await queryRunner.query(`ALTER TABLE \`questions\` DROP FOREIGN KEY \`FK_bdbe88eee023b14b483ad0d830f\``);
        await queryRunner.query(`ALTER TABLE \`refresh_tokens\` CHANGE \`expiresAt\` \`expiresAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP()`);
        await queryRunner.query(`ALTER TABLE \`claims\` CHANGE \`reviewer_id\` \`reviewer_id\` varchar(36) NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`claims\` CHANGE \`diagram_id\` \`diagram_id\` varchar(36) NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`claims\` CHANGE \`test_result_id\` \`test_result_id\` varchar(36) NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`claims\` CHANGE \`question_id\` \`question_id\` varchar(36) NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`claims\` CHANGE \`reviewedAt\` \`reviewedAt\` timestamp NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`claims\` CHANGE \`reviewerComment\` \`reviewerComment\` text NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`claims\` ADD CONSTRAINT \`FK_101b85ed9a1f068fd22c65a1681\` FOREIGN KEY (\`reviewer_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`claims\` ADD CONSTRAINT \`FK_94b39eab939e6e5cff0df666c49\` FOREIGN KEY (\`diagram_id\`) REFERENCES \`diagrams\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`claims\` ADD CONSTRAINT \`FK_e35fa0900ccac58f73ddee5ad74\` FOREIGN KEY (\`test_result_id\`) REFERENCES \`test_results\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`claims\` ADD CONSTRAINT \`FK_f5ba25037816797d23e98a00994\` FOREIGN KEY (\`question_id\`) REFERENCES \`questions\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`test_results\` CHANGE \`question_id\` \`question_id\` varchar(36) NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`test_results\` CHANGE \`isCorrect\` \`isCorrect\` tinyint NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`test_results\` CHANGE \`selectedIndex\` \`selectedIndex\` int NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`test_results\` ADD CONSTRAINT \`FK_f9639f4d28117f9fca41982f038\` FOREIGN KEY (\`question_id\`) REFERENCES \`questions\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`test_sessions\` CHANGE \`completedAt\` \`completedAt\` timestamp NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`test_sessions\` DROP COLUMN \`metadata\``);
        await queryRunner.query(`ALTER TABLE \`test_sessions\` ADD \`metadata\` longtext COLLATE "utf8mb4_bin" NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`test_sessions\` CHANGE \`score\` \`score\` float(12) NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`test_sessions\` CHANGE \`durationSeconds\` \`durationSeconds\` int NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`test_events\` CHANGE \`result_id\` \`result_id\` varchar(36) NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`test_events\` DROP COLUMN \`payload\``);
        await queryRunner.query(`ALTER TABLE \`test_events\` ADD \`payload\` longtext COLLATE "utf8mb4_bin" NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`test_events\` ADD CONSTRAINT \`FK_4d32a4b999e0fbe7045fc6cb8de\` FOREIGN KEY (\`result_id\`) REFERENCES \`test_results\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`questions\` CHANGE \`reviewedById\` \`reviewedById\` varchar(36) NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`questions\` CHANGE \`creatorId\` \`creatorId\` varchar(36) NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`questions\` CHANGE \`reviewComment\` \`reviewComment\` text NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`questions\` CHANGE \`reviewedAt\` \`reviewedAt\` timestamp NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`questions\` ADD CONSTRAINT \`FK_e52e58fc5d50b943802a3082cf7\` FOREIGN KEY (\`reviewedById\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`questions\` ADD CONSTRAINT \`FK_bdbe88eee023b14b483ad0d830f\` FOREIGN KEY (\`creatorId\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`DROP TABLE \`user_badges\``);
        await queryRunner.query(`DROP INDEX \`REL_824aea29828f9c62c80fbe585b\` ON \`user_goals\``);
        await queryRunner.query(`DROP TABLE \`user_goals\``);
    }

}

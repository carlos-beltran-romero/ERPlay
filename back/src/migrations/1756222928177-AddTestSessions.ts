import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTestSessions1756222928177 implements MigrationInterface {
    name = 'AddTestSessions1756222928177'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`claims\` DROP FOREIGN KEY \`FK_101b85ed9a1f068fd22c65a1681\``);
        await queryRunner.query(`ALTER TABLE \`claims\` DROP FOREIGN KEY \`FK_94b39eab939e6e5cff0df666c49\``);
        await queryRunner.query(`ALTER TABLE \`claims\` DROP FOREIGN KEY \`FK_d4647efdb6d488286a69e2d197e\``);
        await queryRunner.query(`ALTER TABLE \`claims\` DROP FOREIGN KEY \`FK_f5ba25037816797d23e98a00994\``);
        await queryRunner.query(`CREATE TABLE \`test_events\` (\`id\` varchar(36) NOT NULL, \`type\` varchar(80) NOT NULL, \`payload\` json NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`session_id\` varchar(36) NOT NULL, \`result_id\` varchar(36) NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`test_results\` (\`id\` varchar(36) NOT NULL, \`orderIndex\` int NOT NULL, \`promptSnapshot\` text NOT NULL, \`optionsSnapshot\` json NOT NULL, \`correctIndexAtTest\` int NOT NULL, \`selectedIndex\` int NULL, \`usedHint\` tinyint NOT NULL DEFAULT 0, \`revealedAnswer\` tinyint NOT NULL DEFAULT 0, \`attemptsCount\` int NOT NULL DEFAULT '0', \`timeSpentSeconds\` int NOT NULL DEFAULT '0', \`isCorrect\` tinyint NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`session_id\` varchar(36) NOT NULL, \`question_id\` varchar(36) NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`test_sessions\` DROP COLUMN \`timeLimit\``);
        await queryRunner.query(`ALTER TABLE \`test_sessions\` DROP COLUMN \`status\``);
        await queryRunner.query(`ALTER TABLE \`test_sessions\` DROP COLUMN \`started_at\``);
        await queryRunner.query(`ALTER TABLE \`test_sessions\` DROP COLUMN \`ended_at\``);
        await queryRunner.query(`ALTER TABLE \`test_sessions\` DROP COLUMN \`updated_at\``);
        await queryRunner.query(`ALTER TABLE \`test_sessions\` ADD \`totalQuestions\` int NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE \`test_sessions\` ADD \`correctCount\` int NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE \`test_sessions\` ADD \`incorrectCount\` int NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE \`test_sessions\` ADD \`durationSeconds\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`test_sessions\` ADD \`score\` float NULL`);
        await queryRunner.query(`ALTER TABLE \`test_sessions\` ADD \`metadata\` json NULL`);
        await queryRunner.query(`ALTER TABLE \`test_sessions\` ADD \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`test_sessions\` ADD \`completedAt\` timestamp NULL`);
        await queryRunner.query(`ALTER TABLE \`test_sessions\` ADD \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`claims\` ADD \`test_result_id\` varchar(36) NULL`);
        await queryRunner.query(`ALTER TABLE \`questions\` DROP FOREIGN KEY \`FK_bdbe88eee023b14b483ad0d830f\``);
        await queryRunner.query(`ALTER TABLE \`questions\` DROP FOREIGN KEY \`FK_e52e58fc5d50b943802a3082cf7\``);
        await queryRunner.query(`ALTER TABLE \`questions\` CHANGE \`reviewedAt\` \`reviewedAt\` timestamp NULL`);
        await queryRunner.query(`ALTER TABLE \`questions\` CHANGE \`reviewComment\` \`reviewComment\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`questions\` CHANGE \`creatorId\` \`creatorId\` varchar(36) NULL`);
        await queryRunner.query(`ALTER TABLE \`questions\` CHANGE \`reviewedById\` \`reviewedById\` varchar(36) NULL`);
        await queryRunner.query(`ALTER TABLE \`test_sessions\` CHANGE \`mode\` \`mode\` enum ('learning', 'exam', 'errors') NOT NULL DEFAULT 'learning'`);
        await queryRunner.query(`ALTER TABLE \`claims\` CHANGE \`reviewerComment\` \`reviewerComment\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`claims\` CHANGE \`reviewedAt\` \`reviewedAt\` timestamp NULL`);
        await queryRunner.query(`ALTER TABLE \`claims\` CHANGE \`question_id\` \`question_id\` varchar(36) NULL`);
        await queryRunner.query(`ALTER TABLE \`claims\` CHANGE \`diagram_id\` \`diagram_id\` varchar(36) NULL`);
        await queryRunner.query(`ALTER TABLE \`claims\` CHANGE \`reviewer_id\` \`reviewer_id\` varchar(36) NULL`);
        await queryRunner.query(`ALTER TABLE \`refresh_tokens\` CHANGE \`expiresAt\` \`expiresAt\` timestamp NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`questions\` ADD CONSTRAINT \`FK_bdbe88eee023b14b483ad0d830f\` FOREIGN KEY (\`creatorId\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`questions\` ADD CONSTRAINT \`FK_e52e58fc5d50b943802a3082cf7\` FOREIGN KEY (\`reviewedById\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`test_events\` ADD CONSTRAINT \`FK_43e24edcbb498e80ca62d431f80\` FOREIGN KEY (\`session_id\`) REFERENCES \`test_sessions\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`test_events\` ADD CONSTRAINT \`FK_4d32a4b999e0fbe7045fc6cb8de\` FOREIGN KEY (\`result_id\`) REFERENCES \`test_results\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`test_results\` ADD CONSTRAINT \`FK_e51fc3bef47128e892f5a87d604\` FOREIGN KEY (\`session_id\`) REFERENCES \`test_sessions\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`test_results\` ADD CONSTRAINT \`FK_f9639f4d28117f9fca41982f038\` FOREIGN KEY (\`question_id\`) REFERENCES \`questions\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`claims\` ADD CONSTRAINT \`FK_f5ba25037816797d23e98a00994\` FOREIGN KEY (\`question_id\`) REFERENCES \`questions\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`claims\` ADD CONSTRAINT \`FK_e35fa0900ccac58f73ddee5ad74\` FOREIGN KEY (\`test_result_id\`) REFERENCES \`test_results\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`claims\` ADD CONSTRAINT \`FK_94b39eab939e6e5cff0df666c49\` FOREIGN KEY (\`diagram_id\`) REFERENCES \`diagrams\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`claims\` ADD CONSTRAINT \`FK_d4647efdb6d488286a69e2d197e\` FOREIGN KEY (\`student_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`claims\` ADD CONSTRAINT \`FK_101b85ed9a1f068fd22c65a1681\` FOREIGN KEY (\`reviewer_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`claims\` DROP FOREIGN KEY \`FK_101b85ed9a1f068fd22c65a1681\``);
        await queryRunner.query(`ALTER TABLE \`claims\` DROP FOREIGN KEY \`FK_d4647efdb6d488286a69e2d197e\``);
        await queryRunner.query(`ALTER TABLE \`claims\` DROP FOREIGN KEY \`FK_94b39eab939e6e5cff0df666c49\``);
        await queryRunner.query(`ALTER TABLE \`claims\` DROP FOREIGN KEY \`FK_e35fa0900ccac58f73ddee5ad74\``);
        await queryRunner.query(`ALTER TABLE \`claims\` DROP FOREIGN KEY \`FK_f5ba25037816797d23e98a00994\``);
        await queryRunner.query(`ALTER TABLE \`test_results\` DROP FOREIGN KEY \`FK_f9639f4d28117f9fca41982f038\``);
        await queryRunner.query(`ALTER TABLE \`test_results\` DROP FOREIGN KEY \`FK_e51fc3bef47128e892f5a87d604\``);
        await queryRunner.query(`ALTER TABLE \`test_events\` DROP FOREIGN KEY \`FK_4d32a4b999e0fbe7045fc6cb8de\``);
        await queryRunner.query(`ALTER TABLE \`test_events\` DROP FOREIGN KEY \`FK_43e24edcbb498e80ca62d431f80\``);
        await queryRunner.query(`ALTER TABLE \`questions\` DROP FOREIGN KEY \`FK_e52e58fc5d50b943802a3082cf7\``);
        await queryRunner.query(`ALTER TABLE \`questions\` DROP FOREIGN KEY \`FK_bdbe88eee023b14b483ad0d830f\``);
        await queryRunner.query(`ALTER TABLE \`refresh_tokens\` CHANGE \`expiresAt\` \`expiresAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP()`);
        await queryRunner.query(`ALTER TABLE \`claims\` CHANGE \`reviewer_id\` \`reviewer_id\` varchar(36) NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`claims\` CHANGE \`diagram_id\` \`diagram_id\` varchar(36) NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`claims\` CHANGE \`question_id\` \`question_id\` varchar(36) NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`claims\` CHANGE \`reviewedAt\` \`reviewedAt\` timestamp NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`claims\` CHANGE \`reviewerComment\` \`reviewerComment\` text NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`test_sessions\` CHANGE \`mode\` \`mode\` enum ('learning', 'exam', 'error-review') NOT NULL DEFAULT ''learning''`);
        await queryRunner.query(`ALTER TABLE \`questions\` CHANGE \`reviewedById\` \`reviewedById\` varchar(36) NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`questions\` CHANGE \`creatorId\` \`creatorId\` varchar(36) NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`questions\` CHANGE \`reviewComment\` \`reviewComment\` text NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`questions\` CHANGE \`reviewedAt\` \`reviewedAt\` timestamp NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`questions\` ADD CONSTRAINT \`FK_e52e58fc5d50b943802a3082cf7\` FOREIGN KEY (\`reviewedById\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`questions\` ADD CONSTRAINT \`FK_bdbe88eee023b14b483ad0d830f\` FOREIGN KEY (\`creatorId\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`claims\` DROP COLUMN \`test_result_id\``);
        await queryRunner.query(`ALTER TABLE \`test_sessions\` DROP COLUMN \`updatedAt\``);
        await queryRunner.query(`ALTER TABLE \`test_sessions\` DROP COLUMN \`completedAt\``);
        await queryRunner.query(`ALTER TABLE \`test_sessions\` DROP COLUMN \`createdAt\``);
        await queryRunner.query(`ALTER TABLE \`test_sessions\` DROP COLUMN \`metadata\``);
        await queryRunner.query(`ALTER TABLE \`test_sessions\` DROP COLUMN \`score\``);
        await queryRunner.query(`ALTER TABLE \`test_sessions\` DROP COLUMN \`durationSeconds\``);
        await queryRunner.query(`ALTER TABLE \`test_sessions\` DROP COLUMN \`incorrectCount\``);
        await queryRunner.query(`ALTER TABLE \`test_sessions\` DROP COLUMN \`correctCount\``);
        await queryRunner.query(`ALTER TABLE \`test_sessions\` DROP COLUMN \`totalQuestions\``);
        await queryRunner.query(`ALTER TABLE \`test_sessions\` ADD \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`test_sessions\` ADD \`ended_at\` timestamp NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`test_sessions\` ADD \`started_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`test_sessions\` ADD \`status\` enum ('in_progress', 'completed') NOT NULL DEFAULT ''in_progress''`);
        await queryRunner.query(`ALTER TABLE \`test_sessions\` ADD \`timeLimit\` int NULL DEFAULT 'NULL'`);
        await queryRunner.query(`DROP TABLE \`test_results\``);
        await queryRunner.query(`DROP TABLE \`test_events\``);
        await queryRunner.query(`ALTER TABLE \`claims\` ADD CONSTRAINT \`FK_f5ba25037816797d23e98a00994\` FOREIGN KEY (\`question_id\`) REFERENCES \`questions\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`claims\` ADD CONSTRAINT \`FK_d4647efdb6d488286a69e2d197e\` FOREIGN KEY (\`student_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`claims\` ADD CONSTRAINT \`FK_94b39eab939e6e5cff0df666c49\` FOREIGN KEY (\`diagram_id\`) REFERENCES \`diagrams\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`claims\` ADD CONSTRAINT \`FK_101b85ed9a1f068fd22c65a1681\` FOREIGN KEY (\`reviewer_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}

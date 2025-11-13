import { MigrationInterface, QueryRunner } from "typeorm";

export class InitSchema21762977581263 implements MigrationInterface {
    name = 'InitSchema21762977581263'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`diagrams\` (\`id\` varchar(36) NOT NULL, \`title\` varchar(255) NOT NULL, \`filename\` varchar(255) NOT NULL, \`path\` varchar(500) NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_2022c2f0548e362c5060f3c1f1\` (\`title\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`options\` (\`id\` varchar(36) NOT NULL, \`text\` text NOT NULL, \`orderIndex\` int NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`questionId\` varchar(36) NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`questions\` (\`id\` varchar(36) NOT NULL, \`prompt\` text NOT NULL, \`hint\` text NOT NULL, \`correctOptionIndex\` int NOT NULL, \`status\` enum ('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending', \`reviewedAt\` timestamp NULL, \`reviewComment\` text NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`diagramId\` varchar(36) NOT NULL, \`creatorId\` varchar(36) NULL, \`reviewedById\` varchar(36) NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`test_events\` (\`id\` varchar(36) NOT NULL, \`type\` varchar(80) NOT NULL, \`payload\` json NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`session_id\` varchar(36) NOT NULL, \`result_id\` varchar(36) NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`test_sessions\` (\`id\` varchar(36) NOT NULL, \`mode\` enum ('learning', 'exam', 'errors') NOT NULL DEFAULT 'learning', \`totalQuestions\` int NOT NULL DEFAULT '0', \`correctCount\` int NOT NULL DEFAULT '0', \`incorrectCount\` int NOT NULL DEFAULT '0', \`durationSeconds\` int NULL, \`score\` float NULL, \`metadata\` json NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`completedAt\` timestamp NULL, \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`userId\` varchar(36) NOT NULL, \`diagramId\` varchar(36) NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`test_results\` (\`id\` varchar(36) NOT NULL, \`orderIndex\` int NOT NULL, \`promptSnapshot\` text NOT NULL, \`optionsSnapshot\` json NOT NULL, \`correctIndexAtTest\` int NOT NULL, \`selectedIndex\` int NULL, \`usedHint\` tinyint NOT NULL DEFAULT 0, \`revealedAnswer\` tinyint NOT NULL DEFAULT 0, \`attemptsCount\` int NOT NULL DEFAULT '0', \`timeSpentSeconds\` int NOT NULL DEFAULT '0', \`isCorrect\` tinyint NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`session_id\` varchar(36) NOT NULL, \`question_id\` varchar(36) NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`claims\` (\`id\` varchar(36) NOT NULL, \`status\` enum ('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING', \`promptSnapshot\` text NOT NULL, \`optionsSnapshot\` json NOT NULL, \`chosenIndex\` int NOT NULL, \`correctIndexAtSubmission\` int NOT NULL, \`explanation\` text NOT NULL, \`reviewerComment\` text NULL, \`reviewedAt\` timestamp NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`question_id\` varchar(36) NULL, \`test_result_id\` varchar(36) NULL, \`diagram_id\` varchar(36) NULL, \`student_id\` varchar(36) NOT NULL, \`reviewer_id\` varchar(36) NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`refresh_tokens\` (\`id\` varchar(36) NOT NULL, \`token\` varchar(500) NOT NULL, \`expiresAt\` timestamp NOT NULL, \`revoked\` tinyint NOT NULL DEFAULT 0, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`userId\` varchar(36) NOT NULL, UNIQUE INDEX \`IDX_4542dd2f38a61354a040ba9fd5\` (\`token\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`users\` (\`id\` varchar(36) NOT NULL, \`name\` varchar(100) NOT NULL, \`lastName\` varchar(100) NOT NULL, \`email\` varchar(255) NOT NULL, \`passwordHash\` varchar(255) NOT NULL, \`role\` enum ('alumno', 'supervisor') NOT NULL DEFAULT 'alumno', \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_97672ac88f789774dd47f7c8be\` (\`email\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`weeklygoal\` (\`id\` varchar(36) NOT NULL, \`weekStart\` date NOT NULL, \`weekEnd\` date NOT NULL, \`targetTests\` int NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`createdById\` varchar(36) NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`options\` ADD CONSTRAINT \`FK_46b668c49a6c4154d4643d875a5\` FOREIGN KEY (\`questionId\`) REFERENCES \`questions\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`questions\` ADD CONSTRAINT \`FK_046a0e3f18c0cd51e8d61624072\` FOREIGN KEY (\`diagramId\`) REFERENCES \`diagrams\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`questions\` ADD CONSTRAINT \`FK_bdbe88eee023b14b483ad0d830f\` FOREIGN KEY (\`creatorId\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`questions\` ADD CONSTRAINT \`FK_e52e58fc5d50b943802a3082cf7\` FOREIGN KEY (\`reviewedById\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`test_events\` ADD CONSTRAINT \`FK_43e24edcbb498e80ca62d431f80\` FOREIGN KEY (\`session_id\`) REFERENCES \`test_sessions\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`test_events\` ADD CONSTRAINT \`FK_4d32a4b999e0fbe7045fc6cb8de\` FOREIGN KEY (\`result_id\`) REFERENCES \`test_results\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`test_sessions\` ADD CONSTRAINT \`FK_87039342f59e95b41cba0d60322\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`test_sessions\` ADD CONSTRAINT \`FK_d1da3c8204bb204536500db2e20\` FOREIGN KEY (\`diagramId\`) REFERENCES \`diagrams\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`test_results\` ADD CONSTRAINT \`FK_e51fc3bef47128e892f5a87d604\` FOREIGN KEY (\`session_id\`) REFERENCES \`test_sessions\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`test_results\` ADD CONSTRAINT \`FK_f9639f4d28117f9fca41982f038\` FOREIGN KEY (\`question_id\`) REFERENCES \`questions\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`claims\` ADD CONSTRAINT \`FK_f5ba25037816797d23e98a00994\` FOREIGN KEY (\`question_id\`) REFERENCES \`questions\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`claims\` ADD CONSTRAINT \`FK_e35fa0900ccac58f73ddee5ad74\` FOREIGN KEY (\`test_result_id\`) REFERENCES \`test_results\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`claims\` ADD CONSTRAINT \`FK_94b39eab939e6e5cff0df666c49\` FOREIGN KEY (\`diagram_id\`) REFERENCES \`diagrams\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`claims\` ADD CONSTRAINT \`FK_d4647efdb6d488286a69e2d197e\` FOREIGN KEY (\`student_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`claims\` ADD CONSTRAINT \`FK_101b85ed9a1f068fd22c65a1681\` FOREIGN KEY (\`reviewer_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`refresh_tokens\` ADD CONSTRAINT \`FK_610102b60fea1455310ccd299de\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`weeklygoal\` ADD CONSTRAINT \`FK_36c1bbc12309805daa577993bfc\` FOREIGN KEY (\`createdById\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`weeklygoal\` DROP FOREIGN KEY \`FK_36c1bbc12309805daa577993bfc\``);
        await queryRunner.query(`ALTER TABLE \`refresh_tokens\` DROP FOREIGN KEY \`FK_610102b60fea1455310ccd299de\``);
        await queryRunner.query(`ALTER TABLE \`claims\` DROP FOREIGN KEY \`FK_101b85ed9a1f068fd22c65a1681\``);
        await queryRunner.query(`ALTER TABLE \`claims\` DROP FOREIGN KEY \`FK_d4647efdb6d488286a69e2d197e\``);
        await queryRunner.query(`ALTER TABLE \`claims\` DROP FOREIGN KEY \`FK_94b39eab939e6e5cff0df666c49\``);
        await queryRunner.query(`ALTER TABLE \`claims\` DROP FOREIGN KEY \`FK_e35fa0900ccac58f73ddee5ad74\``);
        await queryRunner.query(`ALTER TABLE \`claims\` DROP FOREIGN KEY \`FK_f5ba25037816797d23e98a00994\``);
        await queryRunner.query(`ALTER TABLE \`test_results\` DROP FOREIGN KEY \`FK_f9639f4d28117f9fca41982f038\``);
        await queryRunner.query(`ALTER TABLE \`test_results\` DROP FOREIGN KEY \`FK_e51fc3bef47128e892f5a87d604\``);
        await queryRunner.query(`ALTER TABLE \`test_sessions\` DROP FOREIGN KEY \`FK_d1da3c8204bb204536500db2e20\``);
        await queryRunner.query(`ALTER TABLE \`test_sessions\` DROP FOREIGN KEY \`FK_87039342f59e95b41cba0d60322\``);
        await queryRunner.query(`ALTER TABLE \`test_events\` DROP FOREIGN KEY \`FK_4d32a4b999e0fbe7045fc6cb8de\``);
        await queryRunner.query(`ALTER TABLE \`test_events\` DROP FOREIGN KEY \`FK_43e24edcbb498e80ca62d431f80\``);
        await queryRunner.query(`ALTER TABLE \`questions\` DROP FOREIGN KEY \`FK_e52e58fc5d50b943802a3082cf7\``);
        await queryRunner.query(`ALTER TABLE \`questions\` DROP FOREIGN KEY \`FK_bdbe88eee023b14b483ad0d830f\``);
        await queryRunner.query(`ALTER TABLE \`questions\` DROP FOREIGN KEY \`FK_046a0e3f18c0cd51e8d61624072\``);
        await queryRunner.query(`ALTER TABLE \`options\` DROP FOREIGN KEY \`FK_46b668c49a6c4154d4643d875a5\``);
        await queryRunner.query(`DROP TABLE \`weeklygoal\``);
        await queryRunner.query(`DROP INDEX \`IDX_97672ac88f789774dd47f7c8be\` ON \`users\``);
        await queryRunner.query(`DROP TABLE \`users\``);
        await queryRunner.query(`DROP INDEX \`IDX_4542dd2f38a61354a040ba9fd5\` ON \`refresh_tokens\``);
        await queryRunner.query(`DROP TABLE \`refresh_tokens\``);
        await queryRunner.query(`DROP TABLE \`claims\``);
        await queryRunner.query(`DROP TABLE \`test_results\``);
        await queryRunner.query(`DROP TABLE \`test_sessions\``);
        await queryRunner.query(`DROP TABLE \`test_events\``);
        await queryRunner.query(`DROP TABLE \`questions\``);
        await queryRunner.query(`DROP TABLE \`options\``);
        await queryRunner.query(`DROP INDEX \`IDX_2022c2f0548e362c5060f3c1f1\` ON \`diagrams\``);
        await queryRunner.query(`DROP TABLE \`diagrams\``);
    }

}

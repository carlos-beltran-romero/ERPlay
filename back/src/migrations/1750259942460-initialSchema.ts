import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1750259942460 implements MigrationInterface {
    name = 'InitialSchema1750259942460'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`options\` (\`id\` varchar(36) NOT NULL, \`text\` text NOT NULL, \`orderIndex\` int NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`questionId\` varchar(36) NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`questions\` (\`id\` varchar(36) NOT NULL, \`text\` text NOT NULL, \`difficulty\` enum ('principiante', 'intermedio', 'difícil') NOT NULL DEFAULT 'principiante', \`correctOptionIndex\` int NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`diagramId\` varchar(36) NOT NULL, \`creatorId\` varchar(36) NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`diagrams\` (\`id\` varchar(36) NOT NULL, \`filename\` varchar(255) NOT NULL, \`path\` varchar(500) NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`creatorId\` varchar(36) NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`test_answers\` (\`id\` varchar(36) NOT NULL, \`isCorrect\` tinyint NOT NULL, \`answered_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`testSessionId\` varchar(36) NOT NULL, \`questionId\` varchar(36) NOT NULL, \`selectedOptionId\` varchar(36) NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`claims\` (\`id\` varchar(36) NOT NULL, \`justification\` text NOT NULL, \`status\` enum ('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending', \`responseComment\` text NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`userId\` varchar(36) NOT NULL, \`testSessionId\` varchar(36) NOT NULL, \`questionId\` varchar(36) NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`test_sessions\` (\`id\` varchar(36) NOT NULL, \`mode\` enum ('learning', 'exam', 'error-review') NOT NULL DEFAULT 'learning', \`difficulty\` enum ('principiante', 'intermedio', 'difícil') NULL, \`timeLimit\` int NULL, \`status\` enum ('in_progress', 'completed') NOT NULL DEFAULT 'in_progress', \`started_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`ended_at\` timestamp NULL, \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`userId\` varchar(36) NOT NULL, \`diagramId\` varchar(36) NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`refresh_tokens\` (\`id\` varchar(36) NOT NULL, \`token\` varchar(500) NOT NULL, \`expiresAt\` timestamp NOT NULL, \`revoked\` tinyint NOT NULL DEFAULT 0, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`userId\` varchar(36) NOT NULL, UNIQUE INDEX \`IDX_4542dd2f38a61354a040ba9fd5\` (\`token\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`users\` (\`id\` varchar(36) NOT NULL, \`email\` varchar(255) NOT NULL, \`passwordHash\` varchar(255) NOT NULL, \`role\` enum ('alumno', 'supervisor') NOT NULL DEFAULT 'alumno', \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_97672ac88f789774dd47f7c8be\` (\`email\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`options\` ADD CONSTRAINT \`FK_46b668c49a6c4154d4643d875a5\` FOREIGN KEY (\`questionId\`) REFERENCES \`questions\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`questions\` ADD CONSTRAINT \`FK_046a0e3f18c0cd51e8d61624072\` FOREIGN KEY (\`diagramId\`) REFERENCES \`diagrams\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`questions\` ADD CONSTRAINT \`FK_bdbe88eee023b14b483ad0d830f\` FOREIGN KEY (\`creatorId\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`diagrams\` ADD CONSTRAINT \`FK_f8e759235c69d03c33984f898cc\` FOREIGN KEY (\`creatorId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`test_answers\` ADD CONSTRAINT \`FK_dc3ebaeca0a70a879c857bc8fa1\` FOREIGN KEY (\`testSessionId\`) REFERENCES \`test_sessions\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`test_answers\` ADD CONSTRAINT \`FK_f0ae0118e4b142f5bfc8b352009\` FOREIGN KEY (\`questionId\`) REFERENCES \`questions\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`test_answers\` ADD CONSTRAINT \`FK_b29188fdf527f05ccb962310310\` FOREIGN KEY (\`selectedOptionId\`) REFERENCES \`options\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`claims\` ADD CONSTRAINT \`FK_299a3ed5259cccd5cf541512e73\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`claims\` ADD CONSTRAINT \`FK_2cb2356bb6c83edd491dea0f79f\` FOREIGN KEY (\`testSessionId\`) REFERENCES \`test_sessions\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`claims\` ADD CONSTRAINT \`FK_b1ab484147fe65e8b650ac40bfa\` FOREIGN KEY (\`questionId\`) REFERENCES \`questions\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`test_sessions\` ADD CONSTRAINT \`FK_87039342f59e95b41cba0d60322\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`test_sessions\` ADD CONSTRAINT \`FK_d1da3c8204bb204536500db2e20\` FOREIGN KEY (\`diagramId\`) REFERENCES \`diagrams\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`refresh_tokens\` ADD CONSTRAINT \`FK_610102b60fea1455310ccd299de\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`refresh_tokens\` DROP FOREIGN KEY \`FK_610102b60fea1455310ccd299de\``);
        await queryRunner.query(`ALTER TABLE \`test_sessions\` DROP FOREIGN KEY \`FK_d1da3c8204bb204536500db2e20\``);
        await queryRunner.query(`ALTER TABLE \`test_sessions\` DROP FOREIGN KEY \`FK_87039342f59e95b41cba0d60322\``);
        await queryRunner.query(`ALTER TABLE \`claims\` DROP FOREIGN KEY \`FK_b1ab484147fe65e8b650ac40bfa\``);
        await queryRunner.query(`ALTER TABLE \`claims\` DROP FOREIGN KEY \`FK_2cb2356bb6c83edd491dea0f79f\``);
        await queryRunner.query(`ALTER TABLE \`claims\` DROP FOREIGN KEY \`FK_299a3ed5259cccd5cf541512e73\``);
        await queryRunner.query(`ALTER TABLE \`test_answers\` DROP FOREIGN KEY \`FK_b29188fdf527f05ccb962310310\``);
        await queryRunner.query(`ALTER TABLE \`test_answers\` DROP FOREIGN KEY \`FK_f0ae0118e4b142f5bfc8b352009\``);
        await queryRunner.query(`ALTER TABLE \`test_answers\` DROP FOREIGN KEY \`FK_dc3ebaeca0a70a879c857bc8fa1\``);
        await queryRunner.query(`ALTER TABLE \`diagrams\` DROP FOREIGN KEY \`FK_f8e759235c69d03c33984f898cc\``);
        await queryRunner.query(`ALTER TABLE \`questions\` DROP FOREIGN KEY \`FK_bdbe88eee023b14b483ad0d830f\``);
        await queryRunner.query(`ALTER TABLE \`questions\` DROP FOREIGN KEY \`FK_046a0e3f18c0cd51e8d61624072\``);
        await queryRunner.query(`ALTER TABLE \`options\` DROP FOREIGN KEY \`FK_46b668c49a6c4154d4643d875a5\``);
        await queryRunner.query(`DROP INDEX \`IDX_97672ac88f789774dd47f7c8be\` ON \`users\``);
        await queryRunner.query(`DROP TABLE \`users\``);
        await queryRunner.query(`DROP INDEX \`IDX_4542dd2f38a61354a040ba9fd5\` ON \`refresh_tokens\``);
        await queryRunner.query(`DROP TABLE \`refresh_tokens\``);
        await queryRunner.query(`DROP TABLE \`test_sessions\``);
        await queryRunner.query(`DROP TABLE \`claims\``);
        await queryRunner.query(`DROP TABLE \`test_answers\``);
        await queryRunner.query(`DROP TABLE \`diagrams\``);
        await queryRunner.query(`DROP TABLE \`questions\``);
        await queryRunner.query(`DROP TABLE \`options\``);
    }

}

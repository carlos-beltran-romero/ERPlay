import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNameToUser1754998873348 implements MigrationInterface {
    name = 'AddNameToUser1754998873348'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`questions\` DROP FOREIGN KEY \`FK_bdbe88eee023b14b483ad0d830f\``);
        await queryRunner.query(`ALTER TABLE \`questions\` CHANGE \`creatorId\` \`creatorId\` varchar(36) NULL`);
        await queryRunner.query(`ALTER TABLE \`claims\` CHANGE \`responseComment\` \`responseComment\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`test_sessions\` CHANGE \`difficulty\` \`difficulty\` enum ('principiante', 'intermedio', 'difícil') NULL`);
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
        await queryRunner.query(`ALTER TABLE \`test_sessions\` CHANGE \`difficulty\` \`difficulty\` enum ('principiante', 'intermedio', 'difícil') NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`claims\` CHANGE \`responseComment\` \`responseComment\` text NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`questions\` CHANGE \`creatorId\` \`creatorId\` varchar(36) NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`questions\` ADD CONSTRAINT \`FK_bdbe88eee023b14b483ad0d830f\` FOREIGN KEY (\`creatorId\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

}

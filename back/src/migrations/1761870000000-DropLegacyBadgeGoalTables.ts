import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropLegacyBadgeGoalTables1761870000000 implements MigrationInterface {
  name = 'DropLegacyBadgeGoalTables1761870000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `test_answers`');
    await queryRunner.query('DROP TABLE IF EXISTS `user_badges`');
    await queryRunner.query('DROP TABLE IF EXISTS `user_goals`');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE TABLE `user_goals` (`id` varchar(36) NOT NULL, `weeklyTargetQuestions` int NOT NULL DEFAULT \'70\', `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `user_id` varchar(36) NULL, UNIQUE INDEX `REL_824aea29828f9c62c80fbe585b` (`user_id`), PRIMARY KEY (`id`)) ENGINE=InnoDB'
    );
    await queryRunner.query(
      'CREATE TABLE `user_badges` (`id` varchar(36) NOT NULL, `label` varchar(120) NOT NULL, `earnedAt` timestamp NULL, `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `user_id` varchar(36) NOT NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB'
    );
    await queryRunner.query(
      'CREATE TABLE `test_answers` (`id` varchar(36) NOT NULL, `isCorrect` tinyint NOT NULL, `answered_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `testSessionId` varchar(36) NOT NULL, `questionId` varchar(36) NOT NULL, `selectedOptionId` varchar(36) NOT NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB'
    );

    await queryRunner.query(
      'ALTER TABLE `user_goals` ADD CONSTRAINT `FK_824aea29828f9c62c80fbe585ba` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `user_badges` ADD CONSTRAINT `FK_f1221d9b1aaa64b1f3c98ed46d3` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `test_answers` ADD CONSTRAINT `FK_dc3ebaeca0a70a879c857bc8fa1` FOREIGN KEY (`testSessionId`) REFERENCES `test_sessions`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `test_answers` ADD CONSTRAINT `FK_f0ae0118e4b142f5bfc8b352009` FOREIGN KEY (`questionId`) REFERENCES `questions`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `test_answers` ADD CONSTRAINT `FK_b29188fdf527f05ccb962310310` FOREIGN KEY (`selectedOptionId`) REFERENCES `options`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
  }
}

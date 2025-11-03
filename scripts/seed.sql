SET NAMES utf8mb4;
SET time_zone = '+00:00';

SET @supervisor_id = '11111111-1111-4111-8111-111111111111';
SET @student_id = '22222222-2222-4222-8222-222222222222';
SET @student_two_id = '33333333-3333-4333-8333-333333333333';
SET @diagram_id = '44444444-4444-4444-8444-444444444444';
SET @catalog_question_id = '55555555-5555-4555-8555-555555555555';
SET @student_question_id = '66666666-6666-4666-8666-666666666666';
SET @password_hash = '$2b$10$7idZE2SSkatUJdDDAex4xOmnqMRl.o/qmnpSQCkCRWncE/68oDyDO'; -- Password123

INSERT INTO users (id, name, lastName, email, passwordHash, role, created_at, updated_at)
VALUES
  (@supervisor_id, 'Sara', 'Campos', 'supervisor@erplay.io', @password_hash, 'supervisor', NOW(), NOW()),
  (@student_id, 'Leo', 'Pérez', 'alumno1@erplay.io', @password_hash, 'alumno', NOW(), NOW()),
  (@student_two_id, 'Julia', 'Martín', 'alumno2@erplay.io', @password_hash, 'alumno', NOW(), NOW())
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  lastName = VALUES(lastName),
  passwordHash = VALUES(passwordHash),
  role = VALUES(role),
  updated_at = NOW();

INSERT INTO diagrams (id, title, filename, path, creatorId, created_at, updated_at)
VALUES
  (@diagram_id, 'Sistema digestivo', 'digestivo.png', '/uploads/diagrams/digestivo.png', @supervisor_id, NOW(), NOW())
ON DUPLICATE KEY UPDATE
  title = VALUES(title),
  filename = VALUES(filename),
  path = VALUES(path),
  creatorId = VALUES(creatorId),
  updated_at = NOW();

INSERT INTO questions (
  id,
  prompt,
  hint,
  correctOptionIndex,
  diagramId,
  creatorId,
  source,
  status,
  reviewedById,
  reviewedAt,
  reviewComment,
  created_at,
  updated_at
)
VALUES
  (@catalog_question_id,
   '¿Cuál es el órgano responsable de absorber la mayoría de nutrientes?',
   'Se ubica después del estómago.',
   0,
   @diagram_id,
   @supervisor_id,
   'catalog',
   'approved',
   @supervisor_id,
   NOW(),
   NULL,
   NOW(),
   NOW()),
  (@student_question_id,
   '¿Qué órgano impulsa el alimento mediante movimientos peristálticos?',
   'Piensa en la fase final del sistema digestivo.',
   1,
   @diagram_id,
   @student_id,
   'student',
   'approved',
   @supervisor_id,
   NOW(),
   NULL,
   NOW(),
   NOW())
ON DUPLICATE KEY UPDATE
  prompt = VALUES(prompt),
  hint = VALUES(hint),
  correctOptionIndex = VALUES(correctOptionIndex),
  diagramId = VALUES(diagramId),
  creatorId = VALUES(creatorId),
  source = VALUES(source),
  status = VALUES(status),
  reviewedById = VALUES(reviewedById),
  reviewedAt = VALUES(reviewedAt),
  reviewComment = VALUES(reviewComment),
  updated_at = NOW();

DELETE FROM options
WHERE id IN ('opt-cat-1', 'opt-cat-2', 'opt-stu-1', 'opt-stu-2');

INSERT INTO options (id, text, orderIndex, questionId, created_at, updated_at)
VALUES
  ('opt-cat-1', 'Intestino delgado', 0, @catalog_question_id, NOW(), NOW()),
  ('opt-cat-2', 'Estómago', 1, @catalog_question_id, NOW(), NOW()),
  ('opt-stu-1', 'Esófago', 0, @student_question_id, NOW(), NOW()),
  ('opt-stu-2', 'Intestino grueso', 1, @student_question_id, NOW(), NOW())
ON DUPLICATE KEY UPDATE
  text = VALUES(text),
  orderIndex = VALUES(orderIndex),
  questionId = VALUES(questionId),
  updated_at = NOW();

INSERT INTO weekly_goals (id, userId, target, created_at, updated_at)
VALUES
  ('77777777-7777-4777-8777-777777777777', @student_id, 5, NOW(), NOW())
ON DUPLICATE KEY UPDATE
  target = VALUES(target),
  updated_at = NOW();

INSERT INTO user_badges (id, userId, title, description, earnedAt, created_at, updated_at)
VALUES
  ('88888888-8888-4888-8888-888888888888', @student_two_id, 'Curioso digital', 'Completó su primer recorrido guiado.', NOW(), NOW(), NOW())
ON DUPLICATE KEY UPDATE
  title = VALUES(title),
  description = VALUES(description),
  earnedAt = VALUES(earnedAt),
  updated_at = NOW();

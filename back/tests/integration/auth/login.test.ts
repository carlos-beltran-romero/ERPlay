import request from "supertest";
import bcrypt from "bcrypt";

import { createApp } from "../../../src/app";
import { setAuthService } from "../../../src/controllers/auth";
import { AuthService } from "../../../src/services/auth";
import { User, UserRole } from "../../../src/models/User";
import { RefreshToken } from "../../../src/models/RefreshToken";
import { InMemoryRepository } from "../../utils/InMemoryRepository";

describe("POST /api/auth/login", () => {
  const userRepository = new InMemoryRepository<User>(() => new User());
  const refreshTokenRepository = new InMemoryRepository<RefreshToken>(
    () => new RefreshToken()
  );
  const app = createApp();

  beforeEach(async () => {
    userRepository.clear();
    refreshTokenRepository.clear();

    const hashedPassword = await bcrypt.hash("ClaveSegura123", 10);

    const user = userRepository.create({
      name: "Laura",
      lastName: "García",
      email: "laura@example.com",
      passwordHash: hashedPassword,
      role: UserRole.STUDENT,
    });

    await userRepository.save(user);

    const authService = new AuthService(
      userRepository as unknown as any,
      refreshTokenRepository as unknown as any
    );
    setAuthService(authService);
  });

  it("responde con tokens cuando las credenciales son válidas", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "laura@example.com", password: "ClaveSegura123" })
      .expect(200);

    expect(response.body).toHaveProperty("accessToken");
    expect(response.body).toHaveProperty("refreshToken");
    expect(typeof response.body.accessToken).toBe("string");
    expect(typeof response.body.refreshToken).toBe("string");

    const savedTokens = refreshTokenRepository.all();
    expect(savedTokens).toHaveLength(1);
    const [storedToken] = savedTokens;
    expect(storedToken.token).toBe(response.body.refreshToken);
    expect(storedToken.expiresAt).toBeInstanceOf(Date);
    expect(storedToken.expiresAt!.getTime()).toBeGreaterThan(Date.now());
  });

  it("rechaza credenciales incorrectas con estado 400", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "laura@example.com", password: "Incorrecta123" });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("error", "Credenciales incorrectas");
    expect(refreshTokenRepository.all()).toHaveLength(0);
  });
});

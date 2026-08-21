import { ResultSetHeader, RowDataPacket } from 'mysql2';
import pool from '../../database/mysql';

export interface UserRow extends RowDataPacket {
  id: number;
  login_id: string;
  email: string;
  password_hash: string;
  name: string;
  phone: string;
  address: string;
  grade: 'GENERAL' | 'VIP' | 'VVIP';
  mileage: number;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
}

export interface CreateUserInput {
  loginId: string;
  email: string;
  passwordHash: string;
  name: string;
  phone: string;
  address: string;
}

export const findByLoginId = async (loginId: string): Promise<UserRow | null> => {
  const [rows] = await pool.query<UserRow[]>(
    `
      SELECT
        id, login_id, email, password_hash, name, phone, address,
        grade, mileage, status
      FROM users
      WHERE login_id = ?
      LIMIT 1
    `,
    [loginId],
  );

  return rows[0] ?? null;
};

export const findByEmail = async (email: string): Promise<UserRow | null> => {
  const [rows] = await pool.query<UserRow[]>(
    `
      SELECT
        id, login_id, email, password_hash, name, phone, address,
        grade, mileage, status
      FROM users
      WHERE email = ?
      LIMIT 1
    `,
    [email],
  );

  return rows[0] ?? null;
};

export const createUser = async (input: CreateUserInput): Promise<number> => {
  const [result] = await pool.execute<ResultSetHeader>(
    `
      INSERT INTO users (login_id, email, password_hash, name, phone, address)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    [input.loginId, input.email, input.passwordHash, input.name, input.phone, input.address],
  );

  return result.insertId;
};

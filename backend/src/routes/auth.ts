import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();
const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { email, password, role, name, specialty, dob, contactInfo } = req.body as {
      email: string;
      password: string;
      role: Role;
      name: string;
      specialty?: string;
      dob?: string;
      contactInfo?: string;
    };

    if (!email || !password || !role) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const hashed = await bcrypt.hash(password, 10);

    let user;
    if (role === 'DOCTOR') {
      user = await prisma.user.create({
        data: {
          email,
          password: hashed,
          role,
          doctor: {
            create: {
              name,
              specialty: specialty || '',
            },
          },
        },
        include: { doctor: true },
      });
    } else {
      user = await prisma.user.create({
        data: {
          email,
          password: hashed,
          role,
          patient: {
            create: {
              name,
              dob: dob ? new Date(dob) : new Date(),
              contactInfo: contactInfo || '',
            },
          },
        },
        include: { patient: true },
      });
    }

    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, {
      expiresIn: '7d',
    });

    res.status(201).json({ token, user });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body as { email: string; password: string };

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, {
      expiresIn: '7d',
    });

    res.json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
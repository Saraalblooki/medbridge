import { Router } from 'express';
import { PrismaClient, Role } from '@prisma/client';
import { authenticate, authorizeRoles, AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();
const router = Router();

// Get current user's profile
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    if (req.user?.role === 'DOCTOR') {
      const profile = await prisma.doctorProfile.findUnique({ where: { userId: req.user.userId } });
      return res.json(profile);
    } else if (req.user?.role === 'PATIENT') {
      const profile = await prisma.patientProfile.findUnique({ where: { userId: req.user.userId } });
      return res.json(profile);
    }
    res.status(404).json({ message: 'Profile not found' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Doctor updates profile
router.put('/', authenticate, authorizeRoles(Role.DOCTOR), async (req: AuthRequest, res) => {
  try {
    const { name, specialty, availability } = req.body as { name?: string; specialty?: string; availability?: any };

    const updated = await prisma.doctorProfile.update({
      where: { userId: req.user!.userId },
      data: { name, specialty, availability },
    });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
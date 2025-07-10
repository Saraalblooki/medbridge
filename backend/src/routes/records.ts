import { Router } from 'express';
import { PrismaClient, Role } from '@prisma/client';
import { authenticate, authorizeRoles, AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();
const router = Router();

// List records for current user or doctor
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    if (req.user?.role === 'PATIENT') {
      const records = await prisma.healthRecord.findMany({
        where: { patientId: req.user.userId },
        orderBy: { createdAt: 'desc' },
        include: { doctor: true },
      });
      return res.json(records);
    }

    if (req.user?.role === 'DOCTOR') {
      const records = await prisma.healthRecord.findMany({
        where: { doctorId: req.user.userId },
        orderBy: { createdAt: 'desc' },
        include: { patient: true },
      });
      return res.json(records);
    }

    res.status(403).json({ message: 'Forbidden' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Doctor views records for a specific patient
router.get('/patient/:patientId', authenticate, authorizeRoles(Role.DOCTOR), async (req: AuthRequest, res) => {
  try {
    const patientId = parseInt(req.params.patientId, 10);
    const records = await prisma.healthRecord.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(records);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Doctor creates a record for patient
router.post('/', authenticate, authorizeRoles(Role.DOCTOR), async (req: AuthRequest, res) => {
  try {
    const { patientId, title, content } = req.body as { patientId: number; title: string; content: string };
    if (!patientId || !title || !content) {
      return res.status(400).json({ message: 'patientId, title, content required' });
    }
    const record = await prisma.healthRecord.create({
      data: {
        doctorId: req.user!.userId,
        patientId,
        title,
        content,
      },
    });
    res.status(201).json(record);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Doctor updates record they created
router.patch('/:id', authenticate, authorizeRoles(Role.DOCTOR), async (req: AuthRequest, res) => {
  try {
    const recordId = parseInt(req.params.id, 10);
    const { title, content } = req.body as { title?: string; content?: string };

    const record = await prisma.healthRecord.findUnique({ where: { id: recordId } });
    if (!record || record.doctorId !== req.user!.userId) {
      return res.status(404).json({ message: 'Record not found' });
    }

    const updated = await prisma.healthRecord.update({
      where: { id: recordId },
      data: { title, content },
    });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
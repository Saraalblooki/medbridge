import { Router } from 'express';
import { PrismaClient, AppointmentStatus, Role } from '@prisma/client';
import { authenticate, authorizeRoles, AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();
const router = Router();

// List appointments for current user
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    if (req.user?.role === 'DOCTOR') {
      const appointments = await prisma.appointment.findMany({
        where: { doctorId: req.user.userId },
        include: { patient: true },
        orderBy: { datetime: 'desc' },
      });
      return res.json(appointments);
    } else {
      const appointments = await prisma.appointment.findMany({
        where: { patientId: req.user?.userId },
        include: { doctor: true },
        orderBy: { datetime: 'desc' },
      });
      return res.json(appointments);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Patient requests an appointment
router.post('/', authenticate, authorizeRoles(Role.PATIENT), async (req: AuthRequest, res) => {
  try {
    const { doctorId, datetime } = req.body as { doctorId: number; datetime: string };
    if (!doctorId || !datetime) {
      return res.status(400).json({ message: 'doctorId and datetime required' });
    }

    const appointment = await prisma.appointment.create({
      data: {
        doctorId,
        patientId: req.user!.userId,
        datetime: new Date(datetime),
        status: AppointmentStatus.PENDING,
      },
      include: { doctor: true },
    });

    res.status(201).json(appointment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Doctor updates appointment status
router.patch('/:id/status', authenticate, authorizeRoles(Role.DOCTOR), async (req: AuthRequest, res) => {
  try {
    const { status } = req.body as { status: AppointmentStatus };
    const appointmentId = parseInt(req.params.id, 10);

    if (!status || !Object.values(AppointmentStatus).includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    // Ensure appointment belongs to doctor
    const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } });
    if (!appointment || appointment.doctorId !== req.user!.userId) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    const updated = await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status },
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Doctor sets availability (replace full availability json)
router.put('/availability', authenticate, authorizeRoles(Role.DOCTOR), async (req: AuthRequest, res) => {
  try {
    const { availability } = req.body as { availability: any };
    const updated = await prisma.doctorProfile.update({
      where: { userId: req.user!.userId },
      data: { availability },
    });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Public endpoint to get doctor availability
router.get('/availability/:doctorId', async (req, res) => {
  try {
    const doctorId = parseInt(req.params.doctorId, 10);
    const doc = await prisma.doctorProfile.findUnique({ where: { id: doctorId } });
    if (!doc) return res.status(404).json({ message: 'Doctor not found' });
    res.json({ availability: doc.availability });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
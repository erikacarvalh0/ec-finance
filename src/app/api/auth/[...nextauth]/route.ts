import { handlers } from '@/lib/auth';
import { withAuthMonitoring } from '@/lib/auth/monitoring';

export const runtime = 'nodejs';

export const GET = withAuthMonitoring(handlers.GET);
export const POST = withAuthMonitoring(handlers.POST);

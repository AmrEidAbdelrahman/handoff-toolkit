import { createAuth } from './auth';

const auth = createAuth(process.env.JWT_SECRET ?? 'dev-secret');
console.log('SampleApp started', auth.verify('token'));

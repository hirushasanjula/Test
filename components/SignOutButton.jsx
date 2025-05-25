'use client';
import { signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';

const SignOutButton = () => {
  return (
    <Button onClick={() => signOut({ callbackUrl: '/login' })}>
      Sign Out
    </Button>
  );
};

export default SignOutButton;
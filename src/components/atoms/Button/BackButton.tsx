'use client';

import { Button } from '@/components/atoms/Button';

interface BackButtonProps {
  className?: string;
}

export function BackButton({ className }: BackButtonProps): JSX.Element {
  return (
    <Button 
      variant="outline" 
      size="lg" 
      onClick={() => window.history.back()}
      className={className}
    >
      Go Back
    </Button>
  );
}

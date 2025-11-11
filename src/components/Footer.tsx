import React from 'react';
import { MailIcon } from 'lucide-react';
export function Footer() {
  return <footer className="mt-16 pt-8 border-t border-gray-200">
      <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
        <MailIcon className="w-4 h-4" />
        <span>Technical issues? Contact:</span>
        <a href="mailto:waseemk1204@gmail.com?subject=Transcript%20Merger%20—%20Technical%20Issue" className="text-blue-600 hover:text-blue-700 font-medium">
          waseemk1204@gmail.com
        </a>
      </div>
    </footer>;
}
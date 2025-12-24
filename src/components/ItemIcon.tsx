import React, { useState } from 'react';
import { Item } from '@/services/osrs-api';
import { cn } from '@/lib/utils';

interface ItemIconProps {
  item: Item;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const ItemIcon = ({ item, className, size = 'md' }: ItemIconProps) => {
  const [error, setError] = useState(false);

  // RuneLite static cache is very reliable for item IDs
  const iconUrl = `https://static.runelite.net/cache/item/icon/${item.id}.png`;

  const sizeClasses = {
    sm: 'w-6 h-6 p-0.5', // 24px
    md: 'w-10 h-10 p-1', // 40px
    lg: 'w-16 h-16 p-2', // 64px
    xl: 'w-24 h-24 p-3'  // 96px
  };

  if (error) {
    return (
      <div 
        className={cn(
          "bg-slate-800 rounded flex items-center justify-center font-bold text-slate-500 select-none border border-slate-700",
          sizeClasses[size],
          className
        )}
      >
        {item.name.charAt(0)}
      </div>
    );
  }

  return (
    <div className={cn("relative", sizeClasses[size], className)}>
        <img
            src={iconUrl}
            alt={item.name}
            className="w-full h-full object-contain drop-shadow-md hover:scale-110 transition-transform duration-200"
            onError={() => setError(true)}
            loading="lazy"
        />
    </div>
  );
};

export default ItemIcon;
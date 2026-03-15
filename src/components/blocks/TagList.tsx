import React from "react";

type TagListProps = {
  tags?: string[];
  className?: string;
};

export default function TagList({ tags = [], className = "" }: TagListProps): JSX.Element {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {tags.length > 0 ? (
        tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-800 dark:bg-gray-700 dark:text-gray-200"
          >
            {tag}
          </span>
        ))
      ) : (
        <p className="text-sm text-gray-500 dark:text-gray-400">No tags available</p>
      )}
    </div>
  );
}

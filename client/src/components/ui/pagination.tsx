import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ 
  currentPage = 1, 
  totalPages = 1, 
  onPageChange 
}: PaginationProps) {
  // Ensure valid values and prevent errors
  const safeTotalPages = Math.max(1, totalPages);
  const safeCurrentPage = Math.min(Math.max(1, currentPage), safeTotalPages);
  const renderPageButtons = () => {
    const buttons = [];
    
    // Always show first page
    buttons.push(
      <Button
        key="page-1"
        variant={safeCurrentPage === 1 ? "default" : "outline"}
        size="sm"
        onClick={() => onPageChange(1)}
        className={`h-8 w-8 ${safeCurrentPage === 1 ? 'bg-primary text-primary-foreground' : ''}`}
      >
        1
      </Button>
    );

    // If there are many pages, use ellipsis
    if (safeTotalPages > 5) {
      if (safeCurrentPage > 3) {
        buttons.push(
          <span key="ellipsis-start" className="flex items-center justify-center h-8 w-8">
            ...
          </span>
        );
      }

      // Show current page and surrounding pages
      const startPage = Math.max(2, safeCurrentPage - 1);
      const endPage = Math.min(safeTotalPages - 1, safeCurrentPage + 1);

      for (let i = startPage; i <= endPage; i++) {
        buttons.push(
          <Button
            key={`page-${i}`}
            variant={safeCurrentPage === i ? "default" : "outline"}
            size="sm"
            onClick={() => onPageChange(i)}
            className={`h-8 w-8 ${safeCurrentPage === i ? 'bg-primary text-primary-foreground' : ''}`}
          >
            {i}
          </Button>
        );
      }

      if (safeCurrentPage < safeTotalPages - 2) {
        buttons.push(
          <span key="ellipsis-end" className="flex items-center justify-center h-8 w-8">
            ...
          </span>
        );
      }
    } else {
      // For fewer pages, show all page buttons
      for (let i = 2; i < safeTotalPages; i++) {
        buttons.push(
          <Button
            key={`page-${i}`}
            variant={safeCurrentPage === i ? "default" : "outline"}
            size="sm"
            onClick={() => onPageChange(i)}
            className={`h-8 w-8 ${safeCurrentPage === i ? 'bg-primary text-primary-foreground' : ''}`}
          >
            {i}
          </Button>
        );
      }
    }

    // Always show last page if there's more than one page
    if (safeTotalPages > 1) {
      buttons.push(
        <Button
          key={`page-${safeTotalPages}`}
          variant={safeCurrentPage === safeTotalPages ? "default" : "outline"}
          size="sm"
          onClick={() => onPageChange(safeTotalPages)}
          className={`h-8 w-8 ${safeCurrentPage === safeTotalPages ? 'bg-primary text-primary-foreground' : ''}`}
        >
          {safeTotalPages}
        </Button>
      );
    }

    return buttons;
  };

  return (
    <nav className="flex items-center space-x-1" aria-label="Pagination">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="h-8 w-8 p-0"
      >
        <span className="sr-only">Previous page</span>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      {renderPageButtons()}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="h-8 w-8 p-0"
      >
        <span className="sr-only">Next page</span>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </nav>
  );
}
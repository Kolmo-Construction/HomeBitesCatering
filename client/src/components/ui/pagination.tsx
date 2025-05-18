import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  const renderPageButtons = () => {
    const buttons = [];
    
    // Always show first page
    buttons.push(
      <Button
        key="page-1"
        variant={currentPage === 1 ? "default" : "outline"}
        size="sm"
        onClick={() => onPageChange(1)}
        className={`h-8 w-8 ${currentPage === 1 ? 'bg-primary text-primary-foreground' : ''}`}
      >
        1
      </Button>
    );

    // If there are many pages, use ellipsis
    if (totalPages > 5) {
      if (currentPage > 3) {
        buttons.push(
          <span key="ellipsis-start" className="flex items-center justify-center h-8 w-8">
            ...
          </span>
        );
      }

      // Show current page and surrounding pages
      const startPage = Math.max(2, currentPage - 1);
      const endPage = Math.min(totalPages - 1, currentPage + 1);

      for (let i = startPage; i <= endPage; i++) {
        buttons.push(
          <Button
            key={`page-${i}`}
            variant={currentPage === i ? "default" : "outline"}
            size="sm"
            onClick={() => onPageChange(i)}
            className={`h-8 w-8 ${currentPage === i ? 'bg-primary text-primary-foreground' : ''}`}
          >
            {i}
          </Button>
        );
      }

      if (currentPage < totalPages - 2) {
        buttons.push(
          <span key="ellipsis-end" className="flex items-center justify-center h-8 w-8">
            ...
          </span>
        );
      }
    } else {
      // For fewer pages, show all page buttons
      for (let i = 2; i < totalPages; i++) {
        buttons.push(
          <Button
            key={`page-${i}`}
            variant={currentPage === i ? "default" : "outline"}
            size="sm"
            onClick={() => onPageChange(i)}
            className={`h-8 w-8 ${currentPage === i ? 'bg-primary text-primary-foreground' : ''}`}
          >
            {i}
          </Button>
        );
      }
    }

    // Always show last page if there's more than one page
    if (totalPages > 1) {
      buttons.push(
        <Button
          key={`page-${totalPages}`}
          variant={currentPage === totalPages ? "default" : "outline"}
          size="sm"
          onClick={() => onPageChange(totalPages)}
          className={`h-8 w-8 ${currentPage === totalPages ? 'bg-primary text-primary-foreground' : ''}`}
        >
          {totalPages}
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
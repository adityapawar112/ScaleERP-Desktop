import React, { useState } from 'react';
import { Pagination, Popover, OverlayTrigger, Form, Button } from 'react-bootstrap';

interface CustomPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

/**
 * A custom pagination component that handles large numbers of pages gracefully.
 * Shows boundaries (1, 2 and Last-1, Last) and the current page context.
 * Clicking on an ellipsis (...) opens a page selector popover.
 */
const CustomPagination: React.FC<CustomPaginationProps> = ({ currentPage, totalPages, onPageChange }) => {
  const [jumpPage, setJumpPage] = useState<string>('');

  const handleJump = (e: React.FormEvent) => {
    e.preventDefault();
    const pageNum = parseInt(jumpPage);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
      onPageChange(pageNum);
      setJumpPage('');
      // Close the popover by clicking the body
      document.body.click();
    }
  };

  const renderPageSelector = (
    <Popover id="popover-page-selector">
      <Popover.Body className="p-2">
        <Form onSubmit={handleJump} className="d-flex gap-2">
          <Form.Control
            type="number"
            size="sm"
            placeholder="Page"
            style={{ width: '70px' }}
            value={jumpPage}
            onChange={(e) => setJumpPage(e.target.value)}
            min={1}
            max={totalPages}
            autoFocus
          />
          <Button variant="primary" size="sm" type="submit">Go</Button>
        </Form>
      </Popover.Body>
    </Popover>
  );

  const items: React.ReactNode[] = [];

  const addPage = (p: number) => {
    items.push(
      <Pagination.Item
        key={p}
        active={p === currentPage}
        onClick={() => onPageChange(p)}
      >
        {p}
      </Pagination.Item>
    );
  };

  const addEllipsis = (key: string) => {
    items.push(
      <OverlayTrigger
        key={key}
        trigger="click"
        rootClose
        placement="top"
        overlay={renderPageSelector}
      >
        <Pagination.Ellipsis style={{ cursor: 'pointer' }} />
      </OverlayTrigger>
    );
  };

  if (totalPages <= 9) {
    for (let i = 1; i <= totalPages; i++) {
      addPage(i);
    }
  } else {
    // Show first two pages
    addPage(1);
    addPage(2);

    // Left ellipsis or buffer
    if (currentPage > 4) {
      addEllipsis('ellipsis-left');
    } else {
      if (currentPage === 3) {
        addPage(3);
      } else if (currentPage === 4) {
        addPage(3);
        addPage(4);
      }
    }

    // Middle pages (around current page)
    if (currentPage > 4 && currentPage < totalPages - 3) {
      addPage(currentPage - 1);
      addPage(currentPage);
      addPage(currentPage + 1);
    }

    // Right ellipsis or buffer
    if (currentPage < totalPages - 3) {
      addEllipsis('ellipsis-right');
    } else {
      if (currentPage === totalPages - 3) {
        addPage(totalPages - 3);
        addPage(totalPages - 2);
      } else if (currentPage === totalPages - 2) {
        addPage(totalPages - 2);
      }
    }

    // Show last two pages
    addPage(totalPages - 1);
    addPage(totalPages);
  }

  if (totalPages <= 1) return null;

  return (
    <Pagination className="mb-0">
      <Pagination.First
        onClick={() => onPageChange(1)}
        disabled={currentPage === 1}
      />
      <Pagination.Prev
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      />
      {items}
      <Pagination.Next
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      />
      <Pagination.Last
        onClick={() => onPageChange(totalPages)}
        disabled={currentPage === totalPages}
      />
    </Pagination>
  );
};

export default CustomPagination;

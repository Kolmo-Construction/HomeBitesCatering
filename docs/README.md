# AI Services Documentation Hub

Welcome to the Home Bites Catering AI Services Documentation Hub. This collection of documents provides comprehensive information about the AI capabilities implemented in our catering management platform.

## Documentation Overview

- [Main Documentation](./ai-services.md) - Complete reference for all AI features
- [Quick Reference Guide](./ai-services-quick-reference.md) - Concise information for common tasks
- [Testing Guide](./ai-services-testing-guide.md) - Instructions for testing AI functionality

## Recent Enhancements

We've recently enhanced the AI lead analysis service to:

1. Better identify and extract prospect information from vendor emails 
2. Integrate with calendar data to detect scheduling conflicts
3. Provide more detailed analysis of lead quality and next steps

## Getting Started

To start using the AI services in your code, check out the examples in the [Quick Reference Guide](./ai-services-quick-reference.md).

To understand how the services work behind the scenes, review the complete [Main Documentation](./ai-services.md).

To test new changes or validate functionality, follow the procedures in the [Testing Guide](./ai-services-testing-guide.md).

## Sample Test

We've included a sample test script at the root of the project:
- `test-calendar-conflict-analysis.js` - Demonstrates the enhanced lead analysis with calendar conflict detection

To run the test:
```bash
node test-calendar-conflict-analysis.js
```

This will show the difference between basic lead analysis and the enhanced version with calendar context.
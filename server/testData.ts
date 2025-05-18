// Test data for raw leads with AI-enriched fields
export const sampleWeddingInquiryEmail = {
  source: 'website_form',
  rawData: JSON.stringify({
    subject: 'Wedding Catering Inquiry - Aug 15, 2025',
    body: 'Hello,\n\nMy fiancé and I are planning our wedding for August 15, 2025, at The Overlook Venue in Seattle. We\'re expecting around 120 guests and looking for catering options. We\'re particularly interested in a mix of Mediterranean and local Pacific Northwest cuisine.\n\nOur budget is flexible but ideally around $8,500-$10,000 for food and service. We would need appetizers during cocktail hour, a plated dinner, and possibly late-night snacks.\n\nCould you send us information about your wedding packages? We\'re hoping to make a decision within the next month.\n\nThank you,\nSamantha Johnson\nPhone: (206) 555-1234\nEmail: samantha.johnson@example.com'
  }),
  extractedProspectName: 'Samantha Johnson',
  extractedProspectEmail: 'samantha.johnson@example.com',
  extractedProspectPhone: '(206) 555-1234',
  eventSummary: 'Wedding catering for 120 guests on Aug 15, 2025',
  extractedEventType: 'Wedding',
  extractedEventDate: '2025-08-15',
  extractedEventTime: 'Not specified',
  extractedGuestCount: 120,
  extractedVenue: 'The Overlook Venue, Seattle',
  extractedMessageSummary: 'Couple seeking Mediterranean/PNW fusion menu for wedding. Budget $8,500-$10,000. Need appetizers, plated dinner, and late-night snacks.',
  receivedAt: new Date(),
  status: 'new' as const,
  notes: 'This lead came through the website contact form',
  
  // AI-enriched fields
  aiBudgetIndication: 'specific_amount',
  aiBudgetValue: 9000,
  aiOverallLeadQuality: 'hot',
  aiUrgencyScore: '4',
  aiClarityOfRequestScore: '5',
  aiDecisionMakerLikelihood: '5',
  aiKeyRequirements: JSON.stringify([
    'Mediterranean and Pacific Northwest fusion cuisine',
    'Appetizers during cocktail hour',
    'Plated dinner service',
    'Late-night snacks option',
    'Catering for 120 guests',
    'Services within budget range of $8,500-$10,000'
  ]),
  aiPotentialRedFlags: JSON.stringify([
    'Decision timeline is only one month',
    'Premium services requested with mid-range budget'
  ]),
  aiCalendarConflictAssessment: 'No conflicts detected for August 15, 2025. This date is currently available.'
};
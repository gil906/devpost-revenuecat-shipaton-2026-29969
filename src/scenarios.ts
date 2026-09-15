import type { Scenario } from './types';

export const scenarios: Scenario[] = [
  {
    id: 'missed-deadline',
    title: 'The missed deadline',
    subtitle: 'Give honest feedback without losing the relationship.',
    category: 'Feedback',
    premium: false,
    difficulty: 'Foundations',
    person: 'Alex',
    role: 'Your direct report',
    context:
      "Alex missed the Tuesday handoff for the second time this month. The design team had to pause its review. You value Alex's work and want to understand what got in the way, without avoiding the impact.",
    goal: 'Name what happened, hear their perspective, and agree on a better handoff.',
    rounds: [
      {
        title: 'Open the conversation',
        prompt: 'I know the handoff was late. Things have been pretty hectic.',
        aim: "Describe the Tuesday handoff and its impact. Invite Alex's perspective.",
        example:
          'The Tuesday handoff arrived late, so the design team had to pause its review. I know this week has been busy. What got in the way?',
        keywords: ['Tuesday', 'handoff', 'review', 'design'],
        receptive:
          "Thanks for asking. Two urgent support requests came in, and I didn't know which work to prioritize.",
        guarded:
          'I feel like you only notice when something goes wrong. There were other urgent requests.',
      },
      {
        title: 'Stay curious under pressure',
        prompt:
          'The support team said their requests were urgent. What was I supposed to do?',
        aim: 'Acknowledge the competing demands without removing the handoff expectation.',
        example:
          'I hear that you were balancing urgent requests. The handoff still matters because the review depends on it. What would help you flag that conflict earlier?',
        keywords: ['support', 'handoff', 'review', 'requests'],
        receptive:
          'If I could check priorities with you when support interrupts, I could give design an earlier warning.',
        guarded:
          "I still don't know what you want me to do differently when everything is urgent.",
      },
      {
        title: 'Make a small agreement',
        prompt: 'Okay, how should we handle the next handoff?',
        aim: 'Propose a specific action and a check-in, then invite agreement.',
        example:
          "Could we agree that you message me by noon on Monday if the Tuesday handoff is at risk? I will help prioritize. Let's check in next Friday to see how that worked.",
        keywords: ['handoff', 'Monday', 'Tuesday', 'prioritize'],
        receptive:
          'Yes. I can flag the risk on Monday, and we can review the plan on Friday.',
        guarded:
          'Can we make that more concrete? I want to know when to raise the issue next time.',
      },
    ],
  },
  {
    id: 'after-hours',
    title: 'The after-hours ping',
    subtitle: 'Set a kind, clear boundary around your time.',
    category: 'Boundaries',
    premium: false,
    difficulty: 'Foundations',
    person: 'Sam',
    role: 'A colleague on your team',
    context:
      'Sam has sent non-urgent messages at 9 pm three evenings this week and expects a reply. You want to stay helpful while protecting time away from work. Your team has a separate on-call channel for incidents.',
    goal: 'Set an explicit response window and a safe path for genuinely urgent work.',
    rounds: [
      {
        title: 'Name the boundary',
        prompt:
          'Hey, did you see my message last night? I needed a quick answer.',
        aim: 'Name the late messages and state when you are available.',
        example:
          'I saw the 9 pm message this morning. I understand you wanted to move ahead. I respond to non-urgent messages during work hours. What was blocking you?',
        keywords: ['9 pm', 'message', 'evening', 'work hours'],
        receptive:
          'I was unsure about the draft, but it could have waited until morning.',
        guarded:
          "It was only a quick question. I didn't realize it was such a big deal.",
      },
      {
        title: 'Hold the line',
        prompt:
          'But sometimes I work late. Do I have to stop sending messages?',
        aim: 'Separate sending a message from expecting an immediate response.',
        example:
          "I understand late work sometimes fits your schedule. You can send a message, but I won't respond outside work hours. Could you mark the deadline so I can prioritize in the morning?",
        keywords: ['message', 'work hours', 'morning', 'deadline'],
        receptive:
          'That makes sense. I can add a deadline rather than expect an answer that evening.',
        guarded:
          "I'm still not sure when I should expect to hear back from you.",
      },
      {
        title: 'Agree on the exception',
        prompt: "What if something really can't wait until morning?",
        aim: 'Use the on-call path for incidents and agree on a check-in.',
        example:
          "For an incident, please use the on-call channel. For everything else, I'll reply by noon the next workday. Could we try that and check in on Friday?",
        keywords: ['incident', 'on-call', 'channel', 'workday'],
        receptive:
          'Got it. Incidents go to on-call, and normal questions can wait for the next workday.',
        guarded: 'What counts as urgent, and where exactly should I send it?',
      },
    ],
  },
  {
    id: 'one-more-thing',
    title: 'Just one more thing',
    subtitle: 'Say no to extra work, not to collaboration.',
    category: 'Saying no',
    premium: false,
    difficulty: 'Foundations',
    person: 'Jordan',
    role: 'Your project partner',
    context:
      "Jordan asks your team to add a dashboard to Friday's release. Your team is already committed to accessibility fixes. Adding the dashboard would put those fixes at risk.",
    goal: 'Explain the trade-off and offer an alternative without making a false promise.',
    rounds: [
      {
        title: 'Say a clear no',
        prompt:
          'Can your team squeeze in a dashboard for Friday? It should be pretty small.',
        aim: 'Name the capacity limit and explain what would be displaced.',
        example:
          "I understand why the dashboard would help. We can't add it to Friday's release without delaying the accessibility fixes. What decision does the dashboard need to support?",
        keywords: ['dashboard', 'Friday', 'accessibility', 'release'],
        receptive:
          'The sales team wants something to show at a meeting next week. A full dashboard might be more than they need.',
        guarded:
          "I thought your team could be more flexible. Are you saying you won't help?",
      },
      {
        title: 'Explore the actual need',
        prompt: 'Sales needs numbers for a meeting. What can I tell them?',
        aim: 'Keep the boundary and explore a smaller, useful alternative.',
        example:
          'I hear that sales needs numbers for the meeting. The release is still full, but an existing report may help. Which numbers do they need?',
        keywords: ['sales', 'numbers', 'report', 'release'],
        receptive:
          'They need the weekly totals. The existing report might be enough.',
        guarded:
          'I need an alternative I can actually take back to the sales team.',
      },
      {
        title: 'Close without overpromising',
        prompt: 'Could we use the report now and revisit the dashboard later?',
        aim: 'Offer a bounded next step, not an unapproved delivery promise.',
        example:
          "Yes. I can send the report by Thursday noon. Let's review the dashboard request at Monday's planning meeting, without committing a delivery date yet. Does that cover the meeting?",
        keywords: ['report', 'Thursday', 'dashboard', 'planning'],
        receptive:
          'Yes, that gives sales what they need now without changing this release.',
        guarded:
          "When will we revisit it? I don't want this request to disappear.",
      },
    ],
  },
  {
    id: 'meeting-interruption',
    title: 'Make room in the meeting',
    subtitle: 'Coach a strong contributor who talks over others.',
    category: 'Feedback',
    premium: true,
    difficulty: 'Stretch',
    person: 'Riley',
    role: 'A senior direct report',
    context:
      "In Tuesday's planning meeting, Riley interrupted two teammates before they finished. You want their expertise in the room, but also space for everyone else.",
    goal: 'Discuss the observable behavior, not a personality label.',
    rounds: [
      {
        title: 'Start with an observation',
        prompt:
          'That was a productive meeting. We got through the agenda fast.',
        aim: 'Describe the interruptions and their impact without labeling Riley.',
        example:
          "In Tuesday's meeting, two teammates were interrupted before finishing. We missed their proposals. I value your expertise. What did you notice in that discussion?",
        keywords: ['Tuesday', 'meeting', 'interrupted', 'proposals'],
        receptive:
          "I was trying to keep us moving. I didn't realize they weren't finished.",
        guarded:
          'Someone has to keep us on track. Is being efficient a problem now?',
      },
      {
        title: 'Separate intent from impact',
        prompt: 'I was helping. We were running out of time.',
        aim: 'Acknowledge the intent and preserve the expectation of shared airtime.',
        example:
          'I understand you wanted to keep the meeting on time. The interruptions meant we lost proposals. How could we protect time and still hear each person?',
        keywords: ['meeting', 'time', 'interruptions', 'proposals'],
        receptive:
          'Maybe I could write my thoughts down and wait until they finish.',
        guarded: 'So am I supposed to just sit quietly when we go off topic?',
      },
      {
        title: 'Choose a visible experiment',
        prompt: 'What should I do in the next planning meeting?',
        aim: 'Agree on one observable change and a time to reflect.',
        example:
          "Could we agree to let each person finish before responding in Monday's meeting? I'll help timebox the agenda. Let's check in afterward to see whether more proposals were heard.",
        keywords: ['Monday', 'meeting', 'finish', 'agenda'],
        receptive: "I can do that. It helps to know you'll watch the time.",
        guarded:
          'How will we know if it worked, and who is keeping us on time?',
      },
    ],
  },
  {
    id: 'upward-boundary',
    title: 'A boundary with your boss',
    subtitle: 'Protect a commitment when priorities keep moving.',
    category: 'Boundaries',
    premium: true,
    difficulty: 'Stretch',
    person: 'Morgan',
    role: 'Your manager',
    context:
      'Morgan has asked for a new presentation by Wednesday. Your team is already preparing a customer migration for Thursday. You need a priority decision, not another invisible overtime commitment.',
    goal: 'Make the capacity trade-off visible and ask for a decision.',
    rounds: [
      {
        title: 'Put the trade-off on the table',
        prompt:
          'I need a new presentation by Wednesday. Can you take care of it?',
        aim: 'State both commitments and ask which takes priority.',
        example:
          "I understand the presentation matters. The team is committed to Thursday's migration, so adding Wednesday's deck would delay testing. Which should take priority?",
        keywords: ['presentation', 'Wednesday', 'migration', 'testing'],
        receptive:
          'The migration cannot slip. What would a smaller presentation look like?',
        guarded: 'I need both. I was hoping you could just make it happen.',
      },
      {
        title: 'Resist the invisible yes',
        prompt: "Can't the team put in a bit more time just this once?",
        aim: 'Restate the limit and offer a bounded option without blaming your boss.',
        example:
          "I hear the pressure. More hours won't give us enough testing time for the migration. Could we reuse the existing presentation and update only the summary?",
        keywords: ['hours', 'testing', 'migration', 'summary'],
        receptive:
          'An updated summary might work. I mainly need the latest status.',
        guarded:
          "I still need to understand what you can deliver, not only what you can't.",
      },
      {
        title: 'Confirm the decision',
        prompt:
          'All right, update the summary and keep the migration on track.',
        aim: 'Confirm scope and timing in a way you can follow through on.',
        example:
          "I'll send the updated summary by Wednesday noon and keep Thursday's migration unchanged. Could we check in tomorrow to confirm those are still the priorities?",
        keywords: ['summary', 'Wednesday', 'Thursday', 'migration'],
        receptive:
          'Agreed. Send the summary Wednesday and flag any new risks tomorrow.',
        guarded:
          "Please make the scope and timing explicit so we don't have another surprise.",
      },
    ],
  },
  {
    id: 'promotion-no',
    title: 'Not this promotion cycle',
    subtitle: 'Be honest about a disappointing decision.',
    category: 'Saying no',
    premium: true,
    difficulty: 'Stretch',
    person: 'Casey',
    role: 'An ambitious direct report',
    context:
      'Casey was not approved for promotion this cycle. The panel wants evidence of cross-team project ownership. You cannot promise the outcome of the next cycle, but you can offer concrete support.',
    goal: 'Deliver the decision clearly, leave room for disappointment, and offer support.',
    rounds: [
      {
        title: 'Be clear and compassionate',
        prompt: 'Did the promotion panel make a decision?',
        aim: 'State the outcome and the evidence gap without hiding behind vague language.',
        example:
          'The panel did not approve promotion this cycle. It needs more evidence of cross-team ownership. I know that is disappointing after your hard work. What questions come up for you?',
        keywords: ['panel', 'promotion', 'cross-team', 'ownership'],
        receptive: 'I am disappointed. I thought my work this year was enough.',
        guarded:
          'That sounds vague. What was missing, and why am I only hearing it now?',
      },
      {
        title: 'Make space before solving',
        prompt: "I worked so hard. I don't know what else you want from me.",
        aim: 'Acknowledge the disappointment and ask before moving to an action plan.',
        example:
          'I hear how disappointing this is. Your work matters, and I should have made the cross-team ownership criteria clearer earlier. What would help right now: discussing the feedback or taking some time?',
        keywords: ['cross-team', 'ownership', 'criteria', 'feedback'],
        receptive:
          'I need a little time, but I do want to understand the criteria.',
        guarded:
          "I don't want another list of things to do before you acknowledge how this feels.",
      },
      {
        title: 'Offer support, not certainty',
        prompt:
          "Can you guarantee I'll get it next time if I lead a cross-team project?",
        aim: 'Avoid a guarantee. Commit to support and a specific review.',
        example:
          "I can't guarantee the next panel's decision. I can help you find a cross-team project and review the ownership criteria with you next Tuesday. Would that be a useful first step?",
        keywords: ['panel', 'cross-team', 'ownership', 'Tuesday'],
        receptive:
          "I appreciate the honesty. Let's look at the criteria together on Tuesday.",
        guarded:
          'I need clarity on what you can actually commit to, rather than another possible outcome.',
      },
    ],
  },
];

export function getScenario(id: string): Scenario {
  const scenario = scenarios.find((item) => item.id === id);
  if (!scenario) throw new Error('This practice scenario is not available.');
  return scenario;
}

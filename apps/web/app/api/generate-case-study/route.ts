import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { projectScope } = body

    if (!projectScope) {
      return NextResponse.json({ error: 'Project scope is required' }, { status: 400 })
    }

    // Create a readable stream for Server-Sent Events
    const encoder = new TextEncoder()
    
    const stream = new ReadableStream({
      start(controller) {
        // Simulate streaming case study generation
        const generateContent = async () => {
          const chunks = [
            '# Case Study: ' + (projectScope.focus || 'Project Analysis') + '\n\n',
            '## Executive Summary\n\n',
            'This case study analyzes the project conducted from ' + projectScope.dateRange.start + ' to ' + projectScope.dateRange.end + '.\n\n',
            '### Key Participants\n',
            projectScope.participants.map((p: string) => `- ${p}`).join('\n') + '\n\n',
            '### Focus Areas\n',
            projectScope.keywords.map((k: string) => `- ${k}`).join('\n') + '\n\n',
            '## Project Overview\n\n',
            'Industry: ' + projectScope.industry + '\n\n',
            '## Analysis\n\n',
            'This project demonstrated significant achievements across multiple dimensions...\n\n',
            '## Conclusions\n\n',
            'The project successfully met its objectives and provided valuable insights for future initiatives.\n\n'
          ]

          for (const chunk of chunks) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`))
            // Add delay to simulate real streaming
            await new Promise(resolve => setTimeout(resolve, 200))
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`))
          controller.close()
        }

        generateContent().catch(error => {
          controller.error(error)
        })
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Error generating case study:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
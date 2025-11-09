import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { question } = await request.json()

    if (!question) {
      return NextResponse.json(
        { error: 'Question is required' },
        { status: 400 }
      )
    }

    const vannaApiUrl = process.env.VANNA_API_BASE_URL || 'http://localhost:8000'

    // Check if Vanna service is available
    try {
      const healthCheck = await fetch(`${vannaApiUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000), // 5 second timeout
      })
      
      if (!healthCheck.ok) {
        return NextResponse.json(
          { 
            error: 'Vanna AI service is not available. Please make sure the service is running on port 8000.',
            details: 'Service health check failed'
          },
          { status: 503 }
        )
      }
    } catch (healthError: any) {
      if (healthError.name === 'AbortError' || healthError.code === 'ECONNREFUSED') {
        return NextResponse.json(
          { 
            error: 'Cannot connect to Vanna AI service. Please ensure the service is running.',
            details: `Service at ${vannaApiUrl} is not reachable. Start it with: cd services/vanna && uvicorn app.main:app --reload --port 8000`
          },
          { status: 503 }
        )
      }
    }

    // Forward request to Vanna AI service
    let response: Response
    try {
      response = await fetch(`${vannaApiUrl}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question }),
        signal: AbortSignal.timeout(30000), // 30 second timeout
      })
    } catch (fetchError: any) {
      // Handle connection errors
      if (fetchError.code === 'ECONNREFUSED' || fetchError.cause?.code === 'ECONNREFUSED') {
        return NextResponse.json(
          { 
            error: 'Cannot connect to Vanna AI service. Please ensure the service is running.',
            details: `Service at ${vannaApiUrl} is not reachable. Start it with: cd services/vanna && uvicorn app.main:app --reload --port 8000`
          },
          { status: 503 }
        )
      }
      if (fetchError.name === 'AbortError') {
        return NextResponse.json(
          { 
            error: 'Request timeout. The Vanna AI service took too long to respond.',
            details: 'The service may be overloaded or not responding.'
          },
          { status: 504 }
        )
      }
      // Re-throw to be caught by outer catch block
      throw fetchError
    }

    if (!response.ok) {
      let errorMessage = 'Unknown error'
      try {
        const errorData = await response.json()
        errorMessage = errorData.detail || errorData.error || JSON.stringify(errorData)
      } catch {
        const errorText = await response.text()
        errorMessage = errorText || `HTTP ${response.status}`
      }
      
      return NextResponse.json(
        { 
          error: `Vanna AI service error: ${errorMessage}`,
          details: `Status: ${response.status}`
        },
        { status: response.status }
      )
    }

    const data = await response.json()

    return NextResponse.json({
      sql: data.sql,
      data: data.data || [],
      chartType: data.chartType,
      // pass through any human-friendly message from the Vanna service
      message: data.message || null,
    })
  } catch (error: any) {
    console.error('Error in chat-with-data:', error)
    
    let errorMessage = 'Failed to process query'
    let statusCode = 500
    
    // Check for connection errors in various places
    if (error.code === 'ECONNREFUSED' || error.cause?.code === 'ECONNREFUSED') {
      errorMessage = 'Cannot connect to Vanna AI service. Please ensure the service is running.'
      statusCode = 503
    } else if (error.name === 'AbortError' || error.cause?.name === 'AbortError') {
      errorMessage = 'Request timeout. The Vanna AI service took too long to respond.'
      statusCode = 504
    } else if (error.message) {
      errorMessage = error.message
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: `Service at ${process.env.VANNA_API_BASE_URL || 'http://localhost:8000'} is not reachable. Start it with: cd services/vanna && uvicorn app.main:app --reload --port 8000`
      },
      { status: statusCode }
    )
  }
}


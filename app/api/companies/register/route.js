export const runtime = 'nodejs';
import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Company from '@/models/Company'
import User from '@/models/User'

export async function POST(request) {
  try {
    const { companyName, email, password, managerName } = await request.json()
    
    await connectDB()
    
    // Check if company email already exists
    const existingCompany = await Company.findOne({ email })
    if (existingCompany) {
      return NextResponse.json(
        { error: 'Company already exists' },
        { status: 400 }
      )
    }
    
    // Create company
    const company = await Company.create({
      name: companyName,
      email
    })
    
    // Create manager user
    const manager = await User.create({
      email,
      password,
      name: managerName,
      role: 'MANAGER',
      companyId: company._id
    })
    
    return NextResponse.json({
      message: 'Company registered successfully',
      companyId: company._id
    }, { status: 201 })
    
  } catch (error) {
    console.error('Company registration error:', error)
    return NextResponse.json(
      { error: 'Failed to register company' },
      { status: 500 }
    )
  }
}
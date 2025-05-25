export const runtime = 'nodejs';
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import Shift from '@/models/Shift'

export async function GET(request, { params }) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    await connectDB()
    
    const shift = await Shift.findById(params.id)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name')
    
    if (!shift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
    }
    
    // Check if user has access to this shift
    if (shift.companyId.toString() !== session.user.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Employees can only view their own shifts
    if (session.user.role === 'EMPLOYEE' && shift.assignedTo._id.toString() !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    return NextResponse.json(shift)
  } catch (error) {
    console.error('Error fetching shift:', error)
    return NextResponse.json(
      { error: 'Failed to fetch shift' },
      { status: 500 }
    )
  }
}

export async function PUT(request, { params }) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const shiftData = await request.json()
    
    await connectDB()
    
    const existingShift = await Shift.findById(params.id)
    
    if (!existingShift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
    }
    
    // Check if shift belongs to the same company
    if (existingShift.companyId.toString() !== session.user.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Update the shift
    const updatedShift = await Shift.findByIdAndUpdate(
      params.id,
      {
        ...shiftData,
        updatedAt: new Date()
      },
      { new: true }
    )
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name')
    
    return NextResponse.json(updatedShift)
  } catch (error) {
    console.error('Error updating shift:', error)
    return NextResponse.json(
      { error: 'Failed to update shift' },
      { status: 500 }
    )
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    await connectDB()
    
    const shift = await Shift.findById(params.id)
    
    if (!shift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
    }
    
    // Check if shift belongs to the same company
    if (shift.companyId.toString() !== session.user.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    await Shift.findByIdAndDelete(params.id)
    
    return NextResponse.json({ message: 'Shift deleted successfully' })
  } catch (error) {
    console.error('Error deleting shift:', error)
    return NextResponse.json(
      { error: 'Failed to delete shift' },
      { status: 500 }
    )
  }
}
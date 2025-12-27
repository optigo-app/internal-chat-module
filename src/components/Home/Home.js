import React from 'react'
import Customers from '../Customers/Customers'

const Home = ({ selectedStatus, selectedTag }) => {
    return (
        <div style={{ height: '100vh', overflow: 'hidden' }}>
            <Customers selectedStatus={selectedStatus} selectedTag={selectedTag} />
        </div>
    )
}

export default Home

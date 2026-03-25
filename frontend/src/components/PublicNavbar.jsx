// import React from 'react'
// import { Container, Nav, Navbar, NavDropdown } from 'react-bootstrap'

// function PublicNavbar() {
//   return (
//    <>
//      <Navbar collapseOnSelect expand="lg" className="bg-body-tertiary" fixed="top">
//       <Container>
//         <Navbar.Brand href="/">FitSphere</Navbar.Brand>
//         <Navbar.Toggle aria-controls="responsive-navbar-nav" />
//         <Navbar.Collapse id="responsive-navbar-nav">
//           <Nav className="me-auto">
//             <Nav.Link href="/">Home</Nav.Link>
//             <Nav.Link href="/about">About</Nav.Link>
          
//           </Nav>
//           <Nav>
//             <Nav.Link href="#deets">More deets</Nav.Link>
           
//           </Nav>
//         </Navbar.Collapse>
//       </Container>
//     </Navbar>
//    </>
//   )
// }

// export default PublicNavbar
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './PublicNavbar.css';
import {
  Collapse,
  Navbar,
  NavbarToggler,
  NavbarBrand,
  Nav,
  NavItem,
  NavLink,
  UncontrolledDropdown,
  DropdownToggle,
  DropdownMenu,
  DropdownItem,
  NavbarText,
  Button,
} from 'reactstrap';

function PublicNavbar(args) {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const toggle = () => setIsOpen(!isOpen);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <div>
      <Navbar expand="md"
        {...args}
        fixed="top"
        style={{
          backgroundColor: scrolled ? 'black' : 'transparent',
          transition: 'background-color 0.3s ease',
          padding: '1rem 2rem',
        }}
        dark 
      >
         {/* Brand */}
      <NavbarBrand href="/" className="fw-bold">
        FitSphere
      </NavbarBrand>

      <NavbarToggler onClick={toggle} />

      <Collapse isOpen={isOpen} navbar>
        {/* Left Links */}
        <Nav className="me-auto ms-2" navbar>
          <NavItem>
            <NavLink href="/" active={pathname === '/'}>
              Home
            </NavLink>
          </NavItem>
          <NavItem>
            <NavLink href="/about" active={pathname === '/about'}>
              About
            </NavLink>
          </NavItem>
          <NavItem>
            <NavLink href="/services" active={pathname === '/services'}>
              Services
            </NavLink>
          </NavItem>
        </Nav>

        {/* Right Buttons */}
        <div className="d-flex gap-2">
          <Button color="light" outline onClick={() => navigate('/login')}>
            Sign In
          </Button>  
        <button className="button-36" role="button" onClick={() => navigate('/login')}>Login</button>
         
        </div>
        </Collapse>
      </Navbar>
    </div>
  );
}

export default PublicNavbar;

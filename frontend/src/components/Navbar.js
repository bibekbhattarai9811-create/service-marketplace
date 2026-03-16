import React from "react";

function Navbar() {
    return (
        <nav className="navbar navbar-dark bg-dark">
            <div className="container">

                <a className="navbar-brand" href="/home">
                    Service Marketplace
                </a>

                <div>
                    <a className="btn btn-outline-light me-2" href="/home">
                        Home
                    </a>

                    <a className="btn btn-outline-light me-2" href="/dashboard">
                        Dashboard
                    </a>

                    <a className="btn btn-success me-2" href="/post-job">
                        Post Job
                    </a>

                    <a className="btn btn-danger" href="/">
                        Logout
                    </a>
                </div>

            </div>
        </nav>
    );
}

export default Navbar;
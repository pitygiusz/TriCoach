import { Button } from 'webcoreui/react'
import { github } from 'webcoreui/icons'

import './app.scss'

const App = () => {
    return (
        <main className="container">
            <h1 className="flex center md">
                Welcome to
                <img src="logo.svg" alt="logo" width="160" />
            </h1>
            <p>
                Edit <code>src/App.tsx</code> to get started.
                For documentation, visit <a href="https://webcoreui.dev" target="_blank">webcoreui.dev</a>
            </p>
            <div className="flex justify-center xs">
                <Button href="https://webcoreui.dev" target="_blank">
                    Get Started
                </Button>
                <Button
                    href="https://github.com/Frontendland/webcoreui"
                    target="_blank"
                    theme="secondary"
                    dangerouslySetInnerHTML={{ __html: `${github} GitHub` }}
                />
            </div>
        </main>
    )
}

export default App

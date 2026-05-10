describe("showPanel", () => {
    const editor = bike.testEditor()

    it("has showPanel function", () => {
        assert(typeof bike.showPanel === "function", "showPanel should be a function")
    })

    it("can show a panel and get a handle", async () => {
        const domScript = `
            var extensionExports = { activate: function(context) {
                context.postMessage({ type: "ready" })
            }}
        `

        const handle = await bike.showPanel({ script: domScript, title: "Test Panel", frame: { x: 0, y: 0, width: 200, height: 150 } })
        assert(handle, "Expected a DOMScriptHandle from showPanel")

        const response = await new Promise<any>((resolve) => {
            handle.onmessage = (message: any) => resolve(message)
        })

        assert.equal(response.type, "ready", "Panel should send ready message")
        handle.dispose()
    })

    it("can exchange messages with a panel", async () => {
        const domScript = `
            var extensionExports = { activate: function(context) {
                context.onmessage = function(message) {
                    context.postMessage({ type: "echo", echo: message.value, doubled: message.value * 2 })
                }
            }}
        `

        const handle = await bike.showPanel({ script: domScript, frame: { x: 0, y: 0, width: 200, height: 150 } })

        const response = await new Promise<any>((resolve) => {
            handle.onmessage = (message: any) => resolve(message)
            handle.postMessage({ type: "test", value: 21 })
        })

        assert.equal(response.echo, 21, "Panel should echo back the value")
        assert.equal(response.doubled, 42, "Panel should return doubled value")
        handle.dispose()
    })

    it("can send multiple messages to a panel", async () => {
        const domScript = `
            var extensionExports = { activate: function(context) {
                var count = 0
                context.onmessage = function(message) {
                    count++
                    context.postMessage({ type: "ack", text: message.text, count: count })
                }
            }}
        `

        const handle = await bike.showPanel({ script: domScript, frame: { x: 0, y: 0, width: 200, height: 150 } })

        const responses: any[] = []
        const allReceived = new Promise<void>((resolve) => {
            handle.onmessage = (message: any) => {
                responses.push(message)
                if (responses.length === 3) resolve()
            }
        })

        handle.postMessage({ type: "send", text: "a" })
        handle.postMessage({ type: "send", text: "b" })
        handle.postMessage({ type: "send", text: "c" })

        await allReceived

        assert.equal(responses.length, 3, "Should have received 3 responses")
        assert.equal(responses[0].text, "a")
        assert.equal(responses[1].text, "b")
        assert.equal(responses[2].text, "c")
        assert.equal(responses[2].count, 3, "Counter should reach 3")
        handle.dispose()
    })

    it("dispose closes the panel", async () => {
        const domScript = `
            var extensionExports = { activate: function(context) {
                context.postMessage({ type: "opened" })
            }}
        `

        const handle = await bike.showPanel({ script: domScript, frame: { x: 0, y: 0, width: 100, height: 100 } })

        await new Promise<any>((resolve) => {
            handle.onmessage = (message: any) => resolve(message)
        })

        // Should not throw
        handle.dispose()
    })

    it("can show a panel with inspector role (default)", async () => {
        const domScript = `
            var extensionExports = { activate: function(context) {
                context.postMessage({ type: "ready" })
            }}
        `

        const handle = await bike.showPanel({ script: domScript, role: 'inspector', frame: { x: 0, y: 0, width: 200, height: 150 } })
        assert(handle, "Expected a DOMScriptHandle from showPanel with inspector role")

        const response = await new Promise<any>((resolve) => {
            handle.onmessage = (message: any) => resolve(message)
        })

        assert.equal(response.type, "ready")
        handle.dispose()
    })

    it("can show a panel with utility role", async () => {
        const domScript = `
            var extensionExports = { activate: function(context) {
                context.postMessage({ type: "ready" })
            }}
        `

        const handle = await bike.showPanel({ script: domScript, role: 'utility', frame: { x: 0, y: 0, width: 200, height: 150 } })
        assert(handle, "Expected a DOMScriptHandle from showPanel with utility role")

        const response = await new Promise<any>((resolve) => {
            handle.onmessage = (message: any) => resolve(message)
        })

        assert.equal(response.type, "ready")
        handle.dispose()
    })

    it("can show a panel with window role", async () => {
        const domScript = `
            var extensionExports = { activate: function(context) {
                context.postMessage({ type: "ready" })
            }}
        `

        const handle = await bike.showPanel({ script: domScript, role: 'window', title: 'Window Role Test', frame: { x: 0, y: 0, width: 300, height: 200 } })
        assert(handle, "Expected a DOMScriptHandle from showPanel with window role")

        const response = await new Promise<any>((resolve) => {
            handle.onmessage = (message: any) => resolve(message)
        })

        assert.equal(response.type, "ready")
        handle.dispose()
    })

    it("can show a panel associated with a window", async () => {
        const window = bike.frontmostWindow
        assert(window, "Expected a frontmost window")

        const domScript = `
            var extensionExports = { activate: function(context) {
                context.postMessage({ type: "attached" })
            }}
        `

        const handle = await bike.showPanel({
            script: domScript,
            title: "Window Panel",
            frame: { x: 0, y: 0, width: 200, height: 150 },
        }, window)

        assert(handle, "Expected a DOMScriptHandle from showPanel with window")

        const response = await new Promise<any>((resolve) => {
            handle.onmessage = (message: any) => resolve(message)
        })

        assert.equal(response.type, "attached")
        handle.dispose()
    })

    it("uses default 400x300 frame when frame is omitted", async () => {
        const domScript = `
            var extensionExports = { activate: function(context) {
                context.postMessage({ type: "ready" })
            }}
        `

        const handle = await bike.showPanel({ script: domScript, title: "Default Size" })
        await new Promise<any>((resolve) => {
            handle.onmessage = (m: any) => resolve(m)
        })
        const f = handle.frame
        const tol = 1
        assert(Math.abs(f.width - 400) <= tol, `default frame.width ${f.width} ~= 400`)
        assert(Math.abs(f.height - 300) <= tol, `default frame.height ${f.height} ~= 300`)
        handle.dispose()
    })

})

describe("PanelHandle.frame", () => {
    const domScript = `
        var extensionExports = { activate: function(context) {
            context.postMessage({ type: "ready" })
        }}
    `

    it("frame option sets initial geometry", async () => {
        const v = bike.mainScreen.visibleFrame
        const initial = { x: v.x + 50, y: v.y + 50, width: 250, height: 180 }
        const handle = await bike.showPanel({ script: domScript, title: "Initial Frame", frame: initial })
        await new Promise<any>((resolve) => {
            handle.onmessage = (m: any) => resolve(m)
        })
        const got = handle.frame
        const tol = 1
        assert(Math.abs(got.x - initial.x) <= tol, `frame.x ${got.x} ~= ${initial.x}`)
        assert(Math.abs(got.y - initial.y) <= tol, `frame.y ${got.y} ~= ${initial.y}`)
        assert(Math.abs(got.width - initial.width) <= tol,
            `frame.width ${got.width} ~= ${initial.width}`)
        assert(Math.abs(got.height - initial.height) <= tol,
            `frame.height ${got.height} ~= ${initial.height}`)
        handle.dispose()
    })

    it("read returns numeric Rect after open", async () => {
        const handle = await bike.showPanel({ script: domScript, frame: { x: 100, y: 100, width: 300, height: 200 } })
        await new Promise<any>((resolve) => {
            handle.onmessage = (m: any) => resolve(m)
        })
        const f = handle.frame
        assert(typeof f.x === "number", "frame.x should be a number")
        assert(typeof f.y === "number", "frame.y should be a number")
        assert(typeof f.width === "number", "frame.width should be a number")
        assert(typeof f.height === "number", "frame.height should be a number")
        assert(f.width > 0, "frame.width should be > 0")
        assert(f.height > 0, "frame.height should be > 0")
        handle.dispose()
    })

    it("write moves and resizes the panel and reads back", async () => {
        const v = bike.mainScreen.visibleFrame
        const handle = await bike.showPanel({ script: domScript, frame: { x: v.x + 50, y: v.y + 50, width: 200, height: 150 } })
        await new Promise<any>((resolve) => {
            handle.onmessage = (m: any) => resolve(m)
        })
        const next = { x: v.x + 120, y: v.y + 120, width: 320, height: 240 }
        handle.frame = next
        const got = handle.frame
        const tol = 1
        assert(Math.abs(got.x - next.x) <= tol, `frame.x ${got.x} ~= ${next.x}`)
        assert(Math.abs(got.y - next.y) <= tol, `frame.y ${got.y} ~= ${next.y}`)
        assert(Math.abs(got.width - next.width) <= tol, `frame.width ${got.width} ~= ${next.width}`)
        assert(Math.abs(got.height - next.height) <= tol, `frame.height ${got.height} ~= ${next.height}`)
        handle.dispose()
    })

    it("ignores a malformed Rect", async () => {
        const v = bike.mainScreen.visibleFrame
        const initial = { x: v.x + 50, y: v.y + 50, width: 200, height: 150 }
        const handle = await bike.showPanel({ script: domScript, frame: initial })
        await new Promise<any>((resolve) => {
            handle.onmessage = (m: any) => resolve(m)
        })
        const before = handle.frame
        ;(handle as any).frame = { x: 0, y: 0 }
        const after = handle.frame
        const tol = 1
        assert(Math.abs(after.x - before.x) <= tol, "frame.x unchanged")
        assert(Math.abs(after.y - before.y) <= tol, "frame.y unchanged")
        assert(Math.abs(after.width - before.width) <= tol, "frame.width unchanged")
        assert(Math.abs(after.height - before.height) <= tol, "frame.height unchanged")
        handle.dispose()
    })
})
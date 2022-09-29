class Room {

    public async join() {
        // Make a http request to /room/join
        await fetch('http://localhost:9005/room/join', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
        });
    }

    public async leave() {
        // Make a http request to /room/leave
        await fetch('http://localhost:9005/room/leave', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
        });
    }
}

export default Room;
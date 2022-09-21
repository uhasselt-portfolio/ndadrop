class Room {

    public async join() {
        // Make a http request to /room/join
        await fetch('http://localhost:3000/room/join', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
        });
    }

}

export default Room;
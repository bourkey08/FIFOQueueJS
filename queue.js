//Simple first in first out queue, puts are roughtly 2.5x slower than an array but gets 6 orders of magnitude faster when benchmarked with 10,000,000 entrys
//This works out to 38ns per put and 4.4ns per get on a i9-9900k @ 5ghz when benchmarked with 10,000,000 entrys
class FIFOQueue {
    //Define pointers for the first and last entrys in the queue
    #First = null;
    #Last = null;
    #Length = 0;

    //Store a promise and its resolve function for use by get_wait
    #AsyncPromise = [null, null];

    //Add an entry to the end of the queue
    put(Entry){
        //Define an object for the new entry with a pointer pointing to its previous entry (if its not the only entry in the queue)
        //There will never be a next entry if we are adding to the end
        const NewEntry = {
            'Prev': null,
            'Next': null,
            'Data': Entry
        }

        //If there is already at least 1 entry in the queue point this entrys prev entry key to the previous entry and update the previous entrys next key to point to this entry
        if (this.#Last !== null){
            //Set our previous entry to the current last entry
            NewEntry['Prev'] = this.#Last;

            //Update the current last entry to point to this entry
            this.#Last['Next'] = NewEntry;

        //Otherwise there are no existing entrys in the array, set this entry to be the first entry in the arrays
        } else {
            this.#First = NewEntry;
        }
 
        //Now set this entry to be the last entry in the queue
        this.#Last = NewEntry;

        this.#Length++;

        //If there is a resolv function then call this now, this will "wake up" any get_wait requests that are waiting for an entry to be added to the queue
        if (this.#AsyncPromise[1] !== null){
            this.#AsyncPromise[1]();
        
            //And clear the resolve function as we only ever need to resolve a promise once
            this.#AsyncPromise[1] = null;
        }
    }

    //Get an entry from the start of the queue
    get(){
        //If there is currently any entrys in the array get the first entry
        if (this.#First !== null){
            const CurrentEntry = this.#First;

            //If there is more than 1 entry in the array update the next entry to be the new first entry and remove this entry from its Prev
            if (CurrentEntry['Next'] !== null){
                CurrentEntry['Next']['Prev'] = null;
                this.#First = CurrentEntry['Next'];

            } else {
                //Otherwise there are no more entrys in the array so we are going to leave the array empty, reset the first and last references
                this.#First = null;
                this.#Last = null;
            }

            this.#Length--;

            return CurrentEntry['Data'];

        } else {
            return null;
        }
    }

    //Returns an entry from the queue, waits asyncronously for an entry to be added if there are no entrys in the queue
    async get_wait(timeout=null){
        //Get the start timestamp, this lets us check if we have reached the timeout before continuing to wait for entrys to be added to the queue
        const start = performance.now();

        while (true){
            //First attempt to get an entry from this queue
            const Entry = this.get();

            //If an entry was found then return it now
            if (Entry !== null){
                return Entry;

            } else {       
                //Check if there is already a waiting promise that is unresolved, if there is not then add one now
                if (this.#AsyncPromise[1] === null){
                    this.#AsyncPromise[0] = new Promise((resolv, reject) => {this.#AsyncPromise[1] = resolv;});
                }

                //If there is a timeout defined, then we wait to wait for either our timeout function or the waiting promise to resolve
                if (timeout !== null){
                    //Check to ensure the timeout has not been reached before we start waiting for an entry, as we are waiting in a loop the timeout may have been already reached
                    if (timeout - (performance.now() - start) <= 0){
                        return null;//If the timeout has been reached then return null
                    }

                    const Sleep = new Promise((resolv, reject) => {setTimeout(() => {resolv();}, timeout - (performance.now() - start));});
                    
                    //Wait for either the sleep function to resolve(timeout expiry) or the data available promise to be resolved
                    await Promise.any([
                        Sleep,
                        this.#AsyncPromise[0]
                    ]);

                } else {//Otherwise there is no timeout, wait indefinatly for an entry to be added
                    await this.#AsyncPromise[0]
                }
            }
        }        
    }

    //Return the length of the queue
    get length(){
        return this.#Length;
    }
}

//Run benchmarks of both the FIFO queue and the same functionality implemented with an array
function BenchMark(){
    //Benchmark Queue
    //Define a queue for benchmarking
    const Queue = new FIFOQueue();

    //Benchmark inserting 10 million entrys
    let start = performance.now();
    
    for (let i=0; i<10000000; i++){
        Queue.put(i);
    }

    console.log(`Queue Puts: ${performance.now() - start}`);

    //benchmark fetching 10 million entrys
    start = performance.now();
    
    for (let i=0; i<10000000; i++){
        Queue.get();
    }

    console.log(`Queue Gets: ${performance.now() - start}`);

    //Array Benchmark
    //Define array for benchmarking
    const QueueA = [];
    start = performance.now();
    
    for (let i=0; i<10000000; i++){
        QueueA.push(i);
    }

    console.log(`Array Puts: ${performance.now() - start}`);

    start = performance.now();
    
    for (let i=0; i<1000; i++){//Only preforming 1000 iterations and then multiply result due to speed
        //Getting from arrays is roughly 2x faster than the queue using pop but this would give a first in last out queue
        //Shifting elements form an array is 
        QueueA.shift();
    }
    console.log(`Array Gets: ${(performance.now() - start) * 10000}`);
}

//Export the FIFOQueue
exports.FIFOQueue = FIFOQueue;

//BenchMark();

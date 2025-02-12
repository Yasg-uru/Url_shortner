import {connect} from 'mongoose';
export const connectDb = async ()=>{
    try {
        const response = await connect(process.env.MONGO_URI as string);
        console.log(`data base is connected with : ${response.connection.host}`)
    } catch (error) {
        console.log('failed to connect with database :', error);
    }
    
}
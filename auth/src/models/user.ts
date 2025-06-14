import mongoose from "mongoose";
import { Password } from "../services/password";

interface UserAttributes{
    email: string,
    password: string
}

interface UserModel extends mongoose.Model<UserDocument>{
    build(attributes: UserAttributes): UserDocument;
}

interface UserDocument extends mongoose.Document{
    email: string,
    password: string
}

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true
    },
    password:{
        type: String,
        required: true
    }
},{
    toJSON: {
        transform(doc, ret){
            ret.id = ret._id;
            delete ret._id;
            delete ret.password;
            delete ret.__v;
        }
    }
});

userSchema.pre('save', async function(done){
    if (this.isModified('password')){
        const hashedPassword = Password.HashPassword(this.get('password'));
        this.set('password',hashedPassword);
    }
    done();
})

userSchema.statics.build = (attributes: UserAttributes) =>{
    return new User(attributes);
}

const User = mongoose.model<UserDocument, UserModel>('User', userSchema);

const buildUser = (attributes: UserAttributes) =>{
    return new User(attributes);
}

export { User, buildUser }
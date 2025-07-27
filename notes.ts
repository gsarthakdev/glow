/*
Tunneling steps:

npm i -g @expo/ngrok
npx expo start --tunnel
This will serve your app from a public URL like: https://xxxxxxx.bacon.19000.exp.direct:80

https://docs.expo.dev/more/expo-cli/
*/

/*
App store steps:
eas build --platform ios                                                 
eas submit -p ios --latest       

Use this line to submit automatically:
eas build --platform ios --auto-submit

Create development build:
eas build --platform ios --profile development 
*/

/*

handleSaveAndContinue() {
    // standardize algo to take in array of objects
    // Given an array of objects, each object containing a child's name and pronoun,
    // each object contains: 
    /*
        {
            "child_name": nameOfChild,
            "pronoun": pronounOfChild
        }
    */
   /*
    for each child in the array, in react native async storage create a key that:
    is the name of the child + generated uuid. This way the key is unique.
    Then for the value, store this:
    {
        "logs": [],
        "flow_basic": [],
        "is_deleted": false,
        "child_name": child_name,
        "pronouns": pronouns,
        "created_at": timestamp,
        "updated_at": timestamp
        "uuid": uuid,
        "onboarding_completed": true
    }
   
   
   }
 */